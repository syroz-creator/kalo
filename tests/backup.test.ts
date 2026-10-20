import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import { IDBFactory, IDBObjectStore } from 'fake-indexeddb';
import { createBackup, parseBackup, restoreBackup } from '../src/services/backup';
import { DEFAULT_PROFILE, loadLoggedItems } from '../src/services/storage';
import { archiveMealPhotos, compactMeal, hydrateMealPhotos } from '../src/services/mealPhotoStore';
import { loadBodyPhotos, saveBodyPhoto } from '../src/services/bodyProgress';
import type { LoggedItem } from '../src/types';

const descriptors = ['localStorage', 'indexedDB'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const);
let entries: Map<string, string>;
let failKey = '';
beforeEach(() => {
  entries = new Map(); failKey = '';
  Object.defineProperty(globalThis, 'indexedDB', { configurable: true, value: new IDBFactory() });
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => { if (key === failKey) throw new DOMException('Full', 'QuotaExceededError'); entries.set(key, value); },
    removeItem: (key: string) => entries.delete(key),
  } });
});
afterEach(() => { for (const [key, descriptor] of descriptors) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key); } });
const photo = 'data:image/jpeg;base64,aGVsbG8=';
const meal = (name = 'Lunch'): LoggedItem => ({ id: crypto.randomUUID(), foodId: crypto.randomUUID(), name, date: '2026-10-01', createdAt: 100, meal: 'lunch', calories: 650, protein: 30, carbs: 60, fat: 20, quantity: 1, unit: 'serving', source: 'ai_camera' });
const fixture = () => ({ format: 'kalo-backup', version: 1, profile: { ...DEFAULT_PROFILE, weightKg: 80 }, meals: [meal()], recipes: [], workouts: [], water: { '2026-10-01': 500 }, waterUnit: 'ml', bodyProgress: [{ date: '2026-10-01', createdAt: 100, imageUrl: photo }] });

test('backup round-trip includes archived meal, recipe and body photos but never API credentials', async () => {
  const item = { ...meal(), imageUrl: photo, estimateNotes: 'Assumed 150 g rice.' };
  await archiveMealPhotos([item]);
  entries.set('kalo_logged_items_v2', JSON.stringify([compactMeal(item)]));
  entries.set('kalo_photo_recipes_v1', JSON.stringify([compactMeal(item)]));
  entries.set('kalo-gemini-api-key', 'do-not-export');
  entries.set('kalo-beta-access-v1', JSON.stringify({ token: 'private-beta-token' }));
  await saveBodyPhoto({ date: '2026-10-01', createdAt: 100, imageUrl: photo });
  const exported = JSON.stringify(await createBackup());
  assert.doesNotMatch(exported, /do-not-export|gemini-api-key|private-beta-token|beta-access/);
  const parsed = parseBackup(exported);
  assert.equal(parsed.meals[0].imageUrl, photo);
  assert.equal(parsed.recipes[0].imageUrl, photo);
  assert.equal(parsed.bodyProgress[0].imageUrl, photo);
  assert.equal(parsed.meals[0].estimateNotes, item.estimateNotes);
});

test('restoring twice adds missing records once, preserves existing records, and does not double water', async () => {
  const existing = meal('Existing');
  entries.set('kalo_logged_items_v2', JSON.stringify([existing]));
  entries.set('kalo_water_ml_v1', JSON.stringify({ '2026-10-01': 1000 }));
  entries.set('kalo_user_profile_v2', JSON.stringify(DEFAULT_PROFILE));
  const incoming = fixture(); incoming.meals.push({ ...existing, name: 'Old version' });
  incoming.meals[0].imageUrl = photo;
  incoming.meals[0].photoId = 'colliding-photo-key';
  const parsed = parseBackup(JSON.stringify(incoming));
  await restoreBackup(parsed, false);
  await restoreBackup(parsed, false);
  assert.equal(loadLoggedItems().length, 2);
  assert.equal(loadLoggedItems().find(m => m.id === existing.id)!.name, 'Existing');
  assert.equal(JSON.parse(entries.get('kalo_water_ml_v1')!)['2026-10-01'], 1000);
  assert.equal(JSON.parse(entries.get('kalo_user_profile_v2')!).weightKg, DEFAULT_PROFILE.weightKg);
  assert.equal((await loadBodyPhotos()).length, 1);
  const restored = await hydrateMealPhotos(loadLoggedItems());
  assert.equal(restored.find(m => m.id !== existing.id)!.imageUrl, photo);
  assert.notEqual(restored.find(m => m.id !== existing.id)!.photoId, 'colliding-photo-key');
});

test('profile replacement is explicit and same-day progress photos are never overwritten', async () => {
  const original = { date: '2026-10-01', createdAt: 25, imageUrl: 'data:image/jpeg;base64,b3JpZ2luYWw=' };
  await saveBodyPhoto(original);
  const result = await restoreBackup(parseBackup(JSON.stringify(fixture())), true);
  assert.equal(result.profile.weightKg, 80);
  assert.deepEqual(await loadBodyPhotos(), [original]);
});

test('invalid, unsupported and hostile backups cannot change device records', async () => {
  const before = [...entries];
  for (const change of [
    { version: 2 }, { format: 'other-app' }, { profile: {} }, { meals: [{ ...meal(), calories: -1 }] },
    { meals: [{ ...meal(), date: '2026-02-30' }] }, { water: { '__bad': 20 } },
    { bodyProgress: [{ date: '2026-10-01', imageUrl: 'javascript:alert(1)', createdAt: 1 }] },
    { meals: [{ ...meal(), ingredients: [{ name: 'Rice' }] }] },
  ]) assert.throws(() => parseBackup(JSON.stringify({ ...fixture(), ...change })), /not a valid Kalo backup/);
  assert.throws(() => parseBackup('{bad json'));
  assert.deepEqual([...entries], before);
});

test('legacy exports keep ml or convert historical 250 ml cups and allow missing body photos', () => {
  const data: any = fixture(); delete data.format; delete data.version; delete data.waterUnit; delete data.bodyProgress;
  data.water['2026-10-01'] = 2;
  assert.equal(parseBackup(JSON.stringify(data)).water['2026-10-01'], 500);
  data.waterUnit = 'ml';
  assert.equal(parseBackup(JSON.stringify(data)).water['2026-10-01'], 2);
});

test('legacy full-resolution meal photos above the body-photo limit remain restorable', () => {
  const incoming = fixture();
  incoming.meals[0].imageUrl = `data:image/jpeg;base64,${'a'.repeat(8_100_000)}`;
  assert.equal(parseBackup(JSON.stringify(incoming)).meals[0].imageUrl!.length, incoming.meals[0].imageUrl.length);
});

test('metadata quota failure rolls back earlier writes and the entire body photo transaction', async () => {
  entries.set('kalo_logged_items_v2', JSON.stringify([meal('Existing')]));
  const before = [...entries];
  failKey = 'kalo_workouts_v2';
  await assert.rejects(restoreBackup(parseBackup(JSON.stringify(fixture())), false), /existing records have been kept/);
  assert.deepEqual([...entries], before);
  assert.deepEqual(await loadBodyPhotos(), []);
});

test('a final photo transaction abort also rolls back metadata already written', async context => {
  entries.set('kalo_logged_items_v2', JSON.stringify([meal('Existing')]));
  const before = [...entries];
  const count = IDBObjectStore.prototype.count;
  context.mock.method(IDBObjectStore.prototype, 'count', function (this: IDBObjectStore, ...args: Parameters<typeof count>) {
    const request = Reflect.apply(count, this, args);
    request.addEventListener('success', () => queueMicrotask(() => this.transaction.abort()));
    return request;
  });
  await assert.rejects(restoreBackup(parseBackup(JSON.stringify(fixture())), false));
  assert.deepEqual([...entries], before);
  assert.deepEqual(await loadBodyPhotos(), []);
});

test('a newer record saved by another tab during restore is preserved', async context => {
  const newer = meal('Added in another tab');
  const getKeys = IDBObjectStore.prototype.getAllKeys;
  context.mock.method(IDBObjectStore.prototype, 'getAllKeys', function (this: IDBObjectStore, ...args: Parameters<typeof getKeys>) {
    entries.set('kalo_logged_items_v2', JSON.stringify([newer]));
    return Reflect.apply(getKeys, this, args);
  });
  await assert.rejects(restoreBackup(parseBackup(JSON.stringify(fixture())), false));
  assert.deepEqual(loadLoggedItems(), [newer]);
  assert.deepEqual(await loadBodyPhotos(), []);
});

test('failed progress-photo writes leave metadata and existing photos untouched', async context => {
  const original = { date: '2026-09-01', createdAt: 25, imageUrl: photo };
  await saveBodyPhoto(original);
  const before = [...entries];
  context.mock.method(IDBObjectStore.prototype, 'add', () => { throw new DOMException('Full', 'QuotaExceededError'); });
  await assert.rejects(restoreBackup(parseBackup(JSON.stringify(fixture())), false));
  assert.deepEqual([...entries], before);
  assert.deepEqual(await loadBodyPhotos(), [original]);
});

test('a missing meal archive cannot masquerade as a complete downloaded backup', async () => {
  entries.set('kalo_logged_items_v2', JSON.stringify([{ ...meal(), photoId: 'missing' }]));
  await assert.rejects(createBackup(), /backup was not downloaded/);
});

test('old exports with unresolved photo references refuse to restore missing photos', async () => {
  const incoming = fixture(); incoming.meals[0].photoId = 'unavailable';
  await assert.rejects(restoreBackup(parseBackup(JSON.stringify(incoming)), false), /missing meal photos/);
  assert.equal(entries.size, 0);
});

test('malformed existing recipes, workouts or water are never silently replaced by restore', async () => {
  for (const key of ['kalo_photo_recipes_v1', 'kalo_workouts_v2', 'kalo_water_ml_v1']) {
    entries.clear(); entries.set(key, '{broken');
    await assert.rejects(restoreBackup(parseBackup(JSON.stringify(fixture())), false));
    assert.deepEqual([...entries], [[key, '{broken']]);
  }
});
