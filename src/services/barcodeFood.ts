import type { BarcodeProduct, Nutrition, ProductPortion } from '../types';
import { UserFacingError } from '../utils/userFacingError';
import { withRequestDeadline } from './requestDeadline';

const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
function nonnegative(value: unknown) {
  if (typeof value !== 'number' && (typeof value !== 'string' || !value.trim())) return undefined;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : undefined;
}

export function normalizeBarcode(value: string) {
  const barcode = value.replace(/\s/g, '');
  if (!/^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(barcode)) throw new UserFacingError('Enter the 8, 12, 13, or 14 digits printed below the barcode.');
  return barcode;
}

export function parseBarcodeProduct(value: unknown, barcode: string): BarcodeProduct {
  if (!record(value) || typeof value.product_name !== 'string' || !value.product_name.trim() || !record(value.nutriments)) throw new UserFacingError('This product does not have enough nutrition information yet. Check its label and log it manually.');
  if (typeof value.code === 'string' && value.code.replace(/^0+/, '') !== barcode.replace(/^0+/, '')) throw new UserFacingError('The product did not match that barcode. Please try scanning it again.');
  const n = value.nutriments;
  const kcal = nonnegative(n['energy-kcal_100g']);
  const kj = nonnegative(n.energy_100g);
  const calories = kcal ?? (kj !== undefined ? kj / 4.184 : undefined);
  const protein = nonnegative(n.proteins_100g), carbs = nonnegative(n.carbohydrates_100g), fat = nonnegative(n.fat_100g);
  if (calories === undefined || protein === undefined || carbs === undefined || fat === undefined) throw new UserFacingError('This product is missing nutrition information. Check its label and log it manually.');
  const servingLabel = typeof value.serving_size === 'string' ? value.serving_size.trim() : undefined;
  const weight = servingLabel?.match(/(\d+(?:[.,]\d+)?)\s*(g|ml)\b/i);
  const servingQuantity = nonnegative(value.serving_quantity) || (weight ? Number(weight[1].replace(',', '.')) : undefined);
  const pieces = servingLabel?.match(/(?:^|\s|\()(\d+(?:[.,]\d+)?)\s+(biscuits?|cookies?|pieces?|bars?|slices?|crackers?)\b/i);
  const count = pieces ? Number(pieces[1].replace(',', '.')) : undefined;
  const pieceQuantity = servingQuantity && count && count > 0 ? servingQuantity / count : undefined;
  let imageUrl: string | undefined;
  try {
    const url = new URL(String(value.image_front_small_url));
    if (url.protocol === 'https:' && url.hostname.endsWith('.openfoodfacts.org')) imageUrl = url.href;
  } catch { /* A missing product photo does not prevent logging. */ }
  return { barcode, name: value.product_name.trim(), brand: typeof value.brands === 'string' ? value.brands.split(',')[0].trim() : undefined,
    imageUrl, unit: value.serving_quantity_unit === 'ml' || weight?.[2].toLowerCase() === 'ml' ? 'ml' : 'g',
    nutritionPer100: { calories, protein, carbs, fat }, servingQuantity, servingLabel, pieceQuantity, pieceLabel: pieces?.[2].replace(/s$/i, '').toLowerCase() };
}

export async function lookupBarcode(value: string, signal?: AbortSignal) {
  const barcode = normalizeBarcode(value);
  try {
    return await withRequestDeadline(async requestSignal => {
      const fields = 'code,product_name,brands,nutriments,serving_size,serving_quantity,serving_quantity_unit,image_front_small_url';
      const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=${fields}`, { signal: requestSignal, headers: { Accept: 'application/json' } });
      if (response.status === 404) throw new UserFacingError('We could not find that product. Check the barcode digits, or log it manually.');
      if (!response.ok) throw new UserFacingError('Product lookup is busy right now. Please try again in a moment.');
      const body: unknown = await response.json();
      if (!record(body) || body.status !== 1) throw new UserFacingError('We could not find that product. Check the barcode digits, or log it manually.');
      return parseBarcodeProduct(body.product, barcode);
    }, 12000, signal);
  } catch (error) {
    if (signal?.aborted || error instanceof UserFacingError) throw error;
    if (error instanceof Error && error.name === 'TimeoutError') throw new UserFacingError('Finding this product took too long. Try again, or log it manually.');
    throw new UserFacingError('We could not look up this product. Check your internet connection and try again.');
  }
}

export function productPortionNutrition(portion: ProductPortion): Nutrition & { weight: number } {
  const { product, mode, amount } = portion;
  const unitWeight = mode === 'weight' ? 1 : mode === 'servings' ? product.servingQuantity : portion.pieceWeight ?? product.pieceQuantity;
  const rawWeight = Number.isFinite(amount) && amount > 0 && unitWeight && Number.isFinite(unitWeight) && unitWeight > 0 ? amount * unitWeight : 0;
  const weight = Number.isFinite(rawWeight) ? rawWeight : 0;
  const scale = weight / 100;
  return { weight, calories: Math.round(product.nutritionPer100.calories * scale),
    protein: Math.round(product.nutritionPer100.protein * scale * 10) / 10,
    carbs: Math.round(product.nutritionPer100.carbs * scale * 10) / 10,
    fat: Math.round(product.nutritionPer100.fat * scale * 10) / 10 };
}
