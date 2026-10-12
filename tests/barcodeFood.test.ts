import assert from 'node:assert/strict';
import test from 'node:test';
import { lookupBarcode, normalizeBarcode, parseBarcodeProduct, productPortionNutrition } from '../src/services/barcodeFood';

const barcode = '8000500391228';
const product = { code: barcode, product_name: 'Kinderini', brands: 'Kinder, Ferrero', serving_size: '2 biscuits (25 g)', serving_quantity: 25,
  nutriments: { 'energy-kcal_100g': 494, proteins_100g: 5.9, carbohydrates_100g: 66.8, fat_100g: 22.1 }, image_front_small_url: 'https://images.openfoodfacts.org/images/products/kinderini.jpg' };

test('barcode entry preserves leading zeros and rejects non-product codes', () => {
  assert.equal(normalizeBarcode(' 0 12345678905 '), '012345678905');
  assert.equal(normalizeBarcode('12345670'), '12345670');
  for (const value of ['123', 'https://example.com', '800050039122x', '123456789012345', '']) assert.throws(() => normalizeBarcode(value), /digits printed below the barcode/);
});

test('product parsing separates per-100g nutrition, servings and individual pieces', () => {
  const result = parseBarcodeProduct(product, barcode);
  assert.equal(result.name, 'Kinderini'); assert.equal(result.brand, 'Kinder');
  assert.equal(result.servingQuantity, 25); assert.equal(result.pieceQuantity, 12.5); assert.equal(result.pieceLabel, 'biscuit');
  assert.equal(result.nutritionPer100.calories, 494);
  assert.equal(result.imageUrl, product.image_front_small_url);
  assert.equal(productPortionNutrition({ product: result, amount: 1, mode: 'pieces' }).calories, 62);
  assert.equal(productPortionNutrition({ product: result, amount: 2, mode: 'pieces' }).calories, 124);
  assert.equal(productPortionNutrition({ product: result, amount: 1, mode: 'servings' }).calories, 124);
  assert.equal(productPortionNutrition({ product: result, amount: 25, mode: 'weight' }).calories, 124);
});

test('missing weights never become assumed 100g servings or pieces', () => {
  const result = parseBarcodeProduct({ ...product, serving_size: undefined, serving_quantity: undefined, quantity: '250 g', product_quantity: 250 }, barcode);
  assert.equal(result.servingQuantity, undefined); assert.equal(result.pieceQuantity, undefined);
  assert.equal(productPortionNutrition({ product: result, amount: 1, mode: 'servings' }).weight, 0);
  assert.equal(productPortionNutrition({ product: result, amount: 1, mode: 'pieces' }).weight, 0);
  assert.equal(productPortionNutrition({ product: result, amount: 2, mode: 'pieces', pieceWeight: 12.5 }).calories, 124);
});

test('kJ values, numeric strings and explicit ml servings are normalized safely', () => {
  const result = parseBarcodeProduct({ ...product, serving_size: '250 ml', serving_quantity: '250', nutriments: { energy_100g: 418.4, proteins_100g: '1', carbohydrates_100g: 2, fat_100g: 3 } }, barcode);
  assert.equal(result.unit, 'ml'); assert.equal(result.servingQuantity, 250);
  assert(Math.abs(result.nutritionPer100.calories - 100) < 0.001);
  assert.equal(productPortionNutrition({ product: result, amount: 1, mode: 'servings' }).calories, 250);
});

test('incomplete, mismatched and malformed products cannot be logged with invented nutrition', () => {
  for (const bad of [null, {}, { ...product, nutriments: { 'energy-kcal_value': 124 } }, { ...product, nutriments: { ...product.nutriments, fat_100g: null } }, { ...product, nutriments: { ...product.nutriments, proteins_100g: -2 } }]) assert.throws(() => parseBarcodeProduct(bad, barcode), /nutrition information/);
  assert.throws(() => parseBarcodeProduct({ ...product, code: '1234567890123' }, barcode), /did not match/);
  assert.equal(parseBarcodeProduct({ ...product, image_front_small_url: 'https://untrusted.example/photo.jpg' }, barcode).imageUrl, undefined);
});

test('invalid and nonfinite portion amounts cannot produce invalid nutrition', () => {
  const result = parseBarcodeProduct(product, barcode);
  for (const amount of [0, -1, NaN, Infinity]) assert.equal(productPortionNutrition({ product: result, amount, mode: 'pieces' }).weight, 0);
  assert.equal(productPortionNutrition({ product: result, amount: Number.MAX_VALUE, mode: 'pieces' }).weight, 0);
});

test('barcode lookup uses the exact product endpoint without any Gemini credentials', async t => {
  const fetch = t.mock.method(globalThis, 'fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    assert.equal(new URL(request.url).pathname, `/api/v2/product/${barcode}.json`);
    assert.equal(request.headers.get('x-goog-api-key'), null); assert(init?.signal);
    return Response.json({ status: 1, product });
  });
  assert.equal((await lookupBarcode(barcode)).pieceQuantity, 12.5);
  assert.equal(fetch.mock.callCount(), 1);
});

test('lookup errors are friendly and do not expose raw database messages', async t => {
  const fetch = t.mock.method(globalThis, 'fetch', async () => Response.json({ status: 0, error: 'private-details' }));
  await assert.rejects(lookupBarcode(barcode), /could not find that product/);
  fetch.mock.mockImplementation(async () => Response.json({ error: 'HTTP 503 private-details' }, { status: 503 }));
  await assert.rejects(lookupBarcode(barcode), /lookup is busy right now/);
  fetch.mock.mockImplementation(async () => { throw new TypeError('private-details'); });
  await assert.rejects(lookupBarcode(barcode), /Check your internet connection/);
});

test('lookup cancellation and timeouts settle even when the network stays silent', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const fetch = t.mock.method(globalThis, 'fetch', async () => new Promise<Response>(() => {}));
  const cancelled = new AbortController();
  const rejection = assert.rejects(lookupBarcode(barcode, cancelled.signal), { name: 'AbortError' });
  cancelled.abort(); await rejection;
  const timeout = assert.rejects(lookupBarcode(barcode), /took too long/);
  t.mock.timers.tick(12000); await timeout;
  assert.equal(fetch.mock.callCount(), 2);
});
