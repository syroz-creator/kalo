import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import { IDBFactory, IDBObjectStore } from 'fake-indexeddb';
import type { LoggedItem } from '../src/types';
import { archiveMealPhotos, hydrateMealPhotos } from '../src/services/mealPhotoStore';

const original = Object.getOwnPropertyDescriptor(globalThis, 'indexedDB');
beforeEach(() => Object.defineProperty(globalThis, 'indexedDB', { configurable: true, value: new IDBFactory() }));
afterEach(() => {
  if (original) Object.defineProperty(globalThis, 'indexedDB', original);
  else Reflect.deleteProperty(globalThis, 'indexedDB');
});

const meal = (id: string): LoggedItem => ({ id, foodId: id, photoId: `meal-${id}`, name: 'Saved meal', date: '2026-10-17', meal: 'lunch', quantity: 1, unit: 'plate', calories: 450, protein: 20, carbs: 40, fat: 15, source: 'ai_camera', createdAt: 100 });

async function seed(photos: [string, string][]) {
  await new Promise<void>((resolve, reject) => {
    const open = indexedDB.open('kalo-meal-photos', 1);
    open.onupgradeneeded = () => open.result.createObjectStore('photos');
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result;
      const tx = db.transaction('photos', 'readwrite');
      photos.forEach(([id, image]) => tx.objectStore('photos').put(image, id));
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onabort = tx.onerror = () => { db.close(); reject(tx.error); };
    };
  });
}

test('unavailable archived photos preserve array identity so recipe effects cannot reload forever', async () => {
  const meals = [meal('missing')];
  const before = JSON.stringify(meals);
  assert.equal(await hydrateMealPhotos(meals), meals);
  assert.equal(await hydrateMealPhotos(meals), meals);
  assert.equal(JSON.stringify(meals), before);
});

test('partially available archives hydrate once and then settle without losing missing-photo records', async () => {
  await seed([['meal-found', 'data:image/png;base64,found']]);
  const meals = [meal('found'), meal('unavailable')];
  const hydrated = await hydrateMealPhotos(meals);
  assert.notEqual(hydrated, meals);
  assert.equal(hydrated[0].imageUrl, 'data:image/png;base64,found');
  assert.equal(hydrated[1], meals[1]);
  assert.equal(await hydrateMealPhotos(hydrated), hydrated);
  assert.equal(meals[0].imageUrl, undefined);
  assert.equal(hydrated[1].photoId, 'meal-unavailable');
});

test('empty image records cannot restart a photo hydration loop', async () => {
  await seed([['meal-empty', '']]);
  const meals = [meal('empty')];
  assert.equal(await hydrateMealPhotos(meals), meals);
});

test('repeat meals sharing one photo make one archive read per hydration', async context => {
  await seed([['meal-shared', 'data:image/png;base64,shared']]);
  const reads = context.mock.method(IDBObjectStore.prototype, 'get');
  const meals = [meal('shared'), { ...meal('shared'), id: 'repeat' }];
  const hydrated = await hydrateMealPhotos(meals);
  assert.equal(reads.mock.callCount(), 1);
  assert.equal(hydrated.length, 2);
  assert.ok(hydrated.every(item => item.imageUrl === 'data:image/png;base64,shared'));
});

test('missing photos remain recoverable when their archive later becomes available', async () => {
  const meals = [meal('later')];
  assert.equal(await hydrateMealPhotos(meals), meals);
  await archiveMealPhotos([{ ...meals[0], imageUrl: 'data:image/png;base64,later' }]);
  assert.equal((await hydrateMealPhotos(meals))[0].imageUrl, 'data:image/png;base64,later');
  assert.equal(meals[0].imageUrl, undefined);
});

test('archive failures reject without changing the previous meal data', async context => {
  context.mock.method(IDBObjectStore.prototype, 'get', () => { throw new DOMException('Unavailable', 'UnknownError'); });
  const meals = [meal('failure')];
  const before = JSON.stringify(meals);
  await assert.rejects(hydrateMealPhotos(meals));
  assert.equal(JSON.stringify(meals), before);
});

test('already hydrated and non-photo meals do not reopen the archive', async context => {
  const open = context.mock.method(indexedDB, 'open');
  const meals = [{ ...meal('inline'), imageUrl: 'data:image/png;base64,inline' }, { ...meal('manual'), photoId: undefined }];
  assert.equal(await hydrateMealPhotos(meals), meals);
  assert.equal(open.mock.callCount(), 0);
});
