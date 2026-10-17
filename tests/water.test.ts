import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { normalizeMealAnalysis } from '../src/utils/mealAnalysis';
import { waterGoalMl, waterSlotMl, waterSlots, waterSlotFill, validWaterMl } from '../src/utils/water';
import { exportSavedMealCopies, loadWaterLogs, saveWaterLogs } from '../src/services/storage';
import { createMealAnalyzer } from '../src/services/mealAnalyzer';

const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
afterEach(() => {
  if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor);
  else Reflect.deleteProperty(globalThis, 'localStorage');
});
function storage(failWrites = false) {
  const entries = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => {
      if (failWrites) throw new DOMException('Full', 'QuotaExceededError');
      entries.set(key, value);
    },
  } });
  return entries;
}
const water = (amount: unknown = 500) => ({ name: 'Plain water', portion: 'Bottle of water', portionQuantity: amount, portionUnit: 'ml', isPlainWater: true, calories: 0, protein: 0, carbs: 0, fat: 0 });
const food = { name: 'Toast', portion: '2 pieces', portionQuantity: 2, portionUnit: 'piece', isPlainWater: false, calories: 160, protein: 6, carbs: 30, fat: 2 };

test('eight equal slots total 2.50 liters and bottles can fill partial slots', () => {
  assert.equal(waterSlots, 8);
  assert.equal(waterSlotMl, 312.5);
  assert.equal(waterSlots * waterSlotMl, waterGoalMl);
  assert.equal(waterSlotFill(0, 0), 0);
  assert.equal(waterSlotFill(500, 0), 1);
  assert(Math.abs(waterSlotFill(500, 1) - .6) < .0001);
  assert.equal(waterSlotFill(500, 2), 0);
  assert.equal(waterSlotFill(3000, 7), 1);
  for (const amount of [-1, NaN, Infinity, 10001]) assert.equal(validWaterMl(amount), false);
});

test('existing 250 ml cup records retain their actual volumes when moving to eight slots', () => {
  const entries = storage();
  const legacy = JSON.stringify({ '2026-10-16': 8, '2026-10-17': 10 });
  entries.set('kalo_water_logs_v2', legacy);
  assert.deepEqual(loadWaterLogs(), { '2026-10-16': 2000, '2026-10-17': 2500 });
  saveWaterLogs({ ...loadWaterLogs(), '2026-10-18': 312.5 });
  assert.deepEqual(loadWaterLogs(), { '2026-10-16': 2000, '2026-10-17': 2500, '2026-10-18': 312.5 });
  assert.equal(entries.get('kalo_water_logs_v2'), legacy);
  assert(entries.has('kalo_water_ml_v1'));
});

test('new milliliter records take precedence and empty new logs do not resurrect legacy water', () => {
  const entries = storage();
  entries.set('kalo_water_logs_v2', JSON.stringify({ '2026-10-17': 10 }));
  saveWaterLogs({ '2026-10-17': 750 });
  assert.deepEqual(loadWaterLogs(), { '2026-10-17': 750 });
  saveWaterLogs({});
  assert.deepEqual(loadWaterLogs(), {});
});

test('water save failures and malformed records cannot overwrite previous water data', () => {
  const entries = storage(true);
  const previous = JSON.stringify({ '2026-10-17': 500 });
  entries.set('kalo_water_ml_v1', previous);
  assert.throws(() => saveWaterLogs({ '2026-10-17': 1000 }), /water could not be saved/);
  assert.equal(entries.get('kalo_water_ml_v1'), previous);
  storage();
  for (const invalid of [NaN, Infinity, -10]) assert.throws(() => saveWaterLogs({ '2026-10-17': invalid }));
});

test('unreadable water is preserved for export instead of overwritten', () => {
  const entries = storage();
  entries.set('kalo_water_ml_v1', '{broken');
  entries.set('kalo_water_logs_v2', JSON.stringify({ '2026-10-17': 4 }));
  assert.deepEqual(loadWaterLogs(), { '2026-10-17': 1000 });
  assert.throws(() => saveWaterLogs({ '2026-10-17': 1500 }));
  assert.equal(exportSavedMealCopies().kalo_water_ml_v1, '{broken');
});

test('a water-only photo is valid hydration and creates no food ingredients or calories', () => {
  const result = normalizeMealAnalysis({ dishName: 'Water bottle', items: [water(750)] });
  assert.deepEqual(result.items, []);
  assert.equal(result.waterMl, 750);
  for (const value of [result.totalCalories, result.totalProtein, result.totalCarbs, result.totalFat]) assert.equal(value, 0);
});

test('water beside food is counted once and cannot contribute to food nutrition', () => {
  const result = normalizeMealAnalysis({ dishName: 'Toast with water', items: [food, { ...water(312.5), calories: 100, protein: 10 }, water(500)] });
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].name, 'Toast');
  assert.equal(result.totalCalories, 160);
  assert.equal(result.totalProtein, 6);
  assert.equal(result.waterMl, 812.5);
});

test('soda, milk, soup, and foods named with water are not inferred to be plain water', () => {
  for (const name of ['Coca-Cola', 'Milk', 'Watermelon', 'Soup', 'Sweetened flavored water']) {
    const result = normalizeMealAnalysis({ dishName: name, items: [{ ...food, name, portion: '250 ml', portionQuantity: 250, portionUnit: 'ml' }] });
    assert.equal(result.totalCalories, 160);
    assert.equal(result.waterMl, undefined);
  }
});

test('missing, nonnumeric, negative, and implausible water volumes fail before logging', () => {
  for (const amount of [undefined, '500', 0, -1, NaN, Infinity, 10001]) {
    assert.throws(() => normalizeMealAnalysis({ dishName: 'Water', items: [{ ...water(), portionQuantity: amount }] }), /water amount/);
  }
  assert.throws(() => normalizeMealAnalysis({ dishName: 'Water', items: [{ ...water(), portionUnit: 'serving' }] }), /water amount/);
  assert.throws(() => normalizeMealAnalysis({ dishName: 'Water', items: [water(6000), water(6000)] }), /water amount/);
  assert.throws(() => normalizeMealAnalysis({ dishName: 'Nothing', items: [] }), /No food/);
});

test('the photo schema and prompt classify plain water, bottle volumes, and normal cup equivalents', async () => {
  let request: any;
  const ai = { models: { generateContent: async (value: unknown) => {
    request = value;
    return { text: JSON.stringify({ dishName: 'Water', items: [water(312.5)] }) };
  } } };
  const result = await createMealAnalyzer(ai as any)({ mimeType: 'image/png', data: 'aGVsbG8=' });
  assert.equal(result.waterMl, 312.5);
  const itemSchema = request.config.responseJsonSchema.properties.items.items;
  assert.equal(itemSchema.properties.isPlainWater.type, 'boolean');
  assert(itemSchema.required.includes('isPlainWater'));
  const prompt = request.contents[0].parts.find((part: any) => part.text)?.text;
  assert.match(prompt, /312\.5 ml/);
  assert.match(prompt, /visible fill level/);
  assert.match(prompt, /Set isPlainWater=true only for plain/);
  assert.match(prompt, /Do not count milk, juice, soda/);
});
