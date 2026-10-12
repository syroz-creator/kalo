import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import type { LoggedItem } from '../src/types';
import { exportSavedMealCopies, loadLoggedItems, loadRecoverableMeals, saveLoggedItems, savePhotoRecipes } from '../src/services/storage';
import { compactMeal } from '../src/services/mealPhotoStore';

const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
afterEach(() => {
  if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor);
  else Reflect.deleteProperty(globalThis, 'localStorage');
});
function storage(limit = Infinity) {
  const entries = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => {
      const size = [...entries].reduce((total, [name, data]) => total + (name === key ? 0 : data.length), value.length);
      if (size > limit) throw new DOMException('Full', 'QuotaExceededError');
      entries.set(key, value);
    },
    removeItem: (key: string) => entries.delete(key),
  } });
  return entries;
}
const meal = (id: string): LoggedItem => ({ id, foodId: `food-${id}`, name: 'Lunch', date: '2026-10-12', createdAt: 100, meal: 'lunch', calories: 650, protein: 30, carbs: 60, fat: 20, quantity: 1, unit: 'serving', source: 'ai_camera' });

test('failed saves are reported and leave the last saved meals intact', () => {
  const entries = storage(950);
  entries.set('kalo_logged_items_v2', JSON.stringify([meal('old')]));
  entries.set('other-app-data', 'x'.repeat(600));
  assert.throws(() => saveLoggedItems([meal('new'), meal('old')]));
  assert.deepEqual(loadLoggedItems().map(item => item.id), ['old']);
});

test('archived photo references keep meal-history and recipe storage small', () => {
  const entries = storage(50000);
  const items = Array.from({ length: 50 }, (_, index) => ({ ...meal(String(index)), imageUrl: `data:image/jpeg;base64,${'x'.repeat(400000)}` }));
  const archived = items.map(compactMeal);
  saveLoggedItems(archived);
  savePhotoRecipes(archived);
  const saved = loadLoggedItems();
  assert.equal(saved.length, 50);
  assert.equal(saved.reduce((total, item) => total + item.calories, 0), 32500);
  assert(saved.every(item => item.photoId && !item.imageUrl));
  assert(entries.get('kalo_logged_items_v2')!.length < 20000);
  assert(entries.get('kalo_photo_recipes_v1')!.length < 20000);
  assert.equal(items[0].imageUrl!.length, 400023);
});

test('legacy inline photos are never stripped before their separate copy commits', () => {
  storage();
  const original = { ...meal('legacy'), imageUrl: 'data:image/png;base64,original-photo' };
  saveLoggedItems([original]);
  assert.equal(loadLoggedItems()[0].imageUrl, original.imageUrl);
  assert.equal(loadLoggedItems()[0].photoId, undefined);
});

test('a failed save never replaces the primary, fallback, or recovery records', () => {
  const entries = storage(800);
  entries.set('kalo_logged_items_v2', JSON.stringify([meal('one')]));
  entries.set('kalo_logged_items_backup_v1', JSON.stringify([meal('older')]));
  const before = [...entries];
  assert.throws(() => saveLoggedItems([meal('one'), meal('two'), meal('three')]));
  assert.deepEqual([...entries], before);
});

test('unreadable history loads its fallback without overwriting the damaged copy', () => {
  const entries = storage();
  saveLoggedItems([meal('one')]);
  saveLoggedItems([meal('two'), meal('one')]);
  entries.set('kalo_logged_items_v2', '{unreadable');
  assert.deepEqual(loadLoggedItems().map(item => item.id), ['one']);
  assert.equal(entries.get('kalo_logged_items_v2'), '{unreadable');
});

test('saving after fallback recovery preserves the unreadable original for export', () => {
  const entries = storage();
  saveLoggedItems([meal('one')]);
  saveLoggedItems([meal('two'), meal('one')]);
  entries.set('kalo_logged_items_v2', '{unreadable');
  saveLoggedItems([meal('new'), ...loadLoggedItems()]);
  assert.equal(exportSavedMealCopies().kalo_unreadable_meals_v1, '{unreadable');
  assert.deepEqual(loadLoggedItems().map(item => item.id), ['new', 'one']);
});

test('unreadable history without a fallback cannot be silently replaced with an empty list', () => {
  const entries = storage();
  entries.set('kalo_logged_items_v2', '{unreadable');
  assert.throws(loadLoggedItems, /existing data has not been replaced/);
  assert.throws(() => saveLoggedItems([]));
  assert.equal(entries.get('kalo_logged_items_v2'), '{unreadable');
});

test('deleted meals stay recoverable after subsequent additions and restore with their original identity', () => {
  storage();
  saveLoggedItems([meal('one'), meal('two')]);
  saveLoggedItems([meal('two')]);
  saveLoggedItems([meal('three'), meal('two')]);
  const candidates = loadRecoverableMeals(loadLoggedItems());
  assert.deepEqual(candidates.map(item => item.id), ['one']);
  saveLoggedItems([...candidates, ...loadLoggedItems()]);
  assert.equal(loadLoggedItems()[0].date, '2026-10-12');
  assert.equal(loadRecoverableMeals(loadLoggedItems()).length, 0);
});

test('recovery checks existing recipe copies without guessing amounts or duplicating active meals', () => {
  const entries = storage();
  saveLoggedItems([meal('active')]);
  entries.set('kalo_photo_recipes_v1', JSON.stringify([meal('active'), meal('missing'), meal('missing')]));
  const candidates = loadRecoverableMeals(loadLoggedItems());
  assert.equal(candidates.length, 1);
  assert.deepEqual(candidates[0], meal('missing'));
});

test('an optional fallback failure does not misreport a successfully committed primary save', () => {
  const entries = storage(250);
  saveLoggedItems([meal('one')]);
  saveLoggedItems([meal('new')]);
  assert.equal(loadLoggedItems()[0].id, 'new');
  assert(entries.has('kalo_logged_items_v2'));
  assert.equal(entries.get('kalo_logged_items_backup_v1'), '[]');
});

test('recovery exports preserve unreadable originals without exporting API credentials', () => {
  const entries = storage();
  entries.set('kalo_logged_items_v2', '{unreadable');
  entries.set('kalo-gemini-api-key', 'private-key');
  assert.deepEqual(exportSavedMealCopies(), { kalo_logged_items_v2: '{unreadable' });
});

test('malformed Recipes are preserved for recovery instead of being overwritten on startup', () => {
  const entries = storage();
  entries.set('kalo_photo_recipes_v1', '{unreadable');
  assert.throws(() => savePhotoRecipes([]));
  assert.equal(entries.get('kalo_photo_recipes_v1'), '{unreadable');
});
