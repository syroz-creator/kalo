import type { AnalyzedFoodItem, MealAnalysisResult } from '../types';
import { UserFacingError } from './userFacingError';

export function getMealDescription(value: string) {
  const description = value.trim();
  if (!description) throw new UserFacingError('Describe your meal first.');
  if (description.length > 2000) throw new UserFacingError('Keep your meal description under 2,000 characters.');
  return description;
}

export function getMealImage(image: unknown, fallbackMime: unknown = 'image/jpeg') {
  if (typeof image !== 'string' || !image.trim()) throw new UserFacingError('Choose a meal photo first.');
  const dataUrl = image.match(/^data:([^;,]+);base64,([\s\S]+)$/);
  const mimeType = dataUrl?.[1] ?? fallbackMime;
  const data = (dataUrl?.[2] ?? image).replace(/\s/g, '');
  if (typeof mimeType !== 'string' || !['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'].includes(mimeType)) {
    throw new UserFacingError('Use a JPEG, PNG, WebP, HEIC, or HEIF photo.');
  }
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(data)) throw new UserFacingError('This photo could not be read. Please select it again.');
  return { mimeType, data };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nutrient(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new UserFacingError('We could not estimate the nutrition for this meal. Please try again.');
  }
  return value;
}

export function normalizeMealAnalysis(value: unknown): MealAnalysisResult {
  if (!isRecord(value) || typeof value.dishName !== 'string' || !value.dishName.trim() || !Array.isArray(value.items)) {
    throw new UserFacingError('We could not estimate this meal. Please try again.');
  }
  if (!value.items.length) throw new UserFacingError('No food was identified. Try a clear photo or describe the foods and portions in your meal.');
  const items: AnalyzedFoodItem[] = value.items.map(item => {
    if (!isRecord(item) || typeof item.name !== 'string' || !item.name.trim() || typeof item.portion !== 'string') {
      throw new UserFacingError('We could not identify all the foods. Try a clearer photo or describe what you ate.');
    }
    return {
      name: item.name.trim(), portion: item.portion,
      calories: nutrient(item.calories), protein: nutrient(item.protein),
      carbs: nutrient(item.carbs), fat: nutrient(item.fat),
      ...(typeof item.portionQuantity === 'number' && Number.isFinite(item.portionQuantity) && item.portionQuantity > 0 && ['g', 'ml', 'piece', 'serving'].includes(String(item.portionUnit)) ? { portionQuantity: item.portionQuantity, portionUnit: item.portionUnit as AnalyzedFoodItem['portionUnit'] } : {}),
      ...(typeof item.gramsPerPiece === 'number' && Number.isFinite(item.gramsPerPiece) && item.gramsPerPiece > 0 ? { gramsPerPiece: item.gramsPerPiece } : {}),
    };
  });
  const total = (key: 'calories' | 'protein' | 'carbs' | 'fat') => items.reduce((sum, item) => sum + item[key], 0);
  return {
    dishName: value.dishName.trim(),
    referenceObjectDetected: typeof value.referenceObjectDetected === 'string' ? value.referenceObjectDetected : '',
    referenceTip: typeof value.referenceTip === 'string' ? value.referenceTip : '',
    notes: typeof value.notes === 'string' ? value.notes : '',
    items,
    totalCalories: Math.round(total('calories')),
    totalProtein: Math.round(total('protein') * 10) / 10,
    totalCarbs: Math.round(total('carbs') * 10) / 10,
    totalFat: Math.round(total('fat') * 10) / 10,
  };
}
