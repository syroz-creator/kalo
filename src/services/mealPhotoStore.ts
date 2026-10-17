import type { LoggedItem } from '../types';
import { withRequestDeadline } from './requestDeadline';

const pending = new Map<string, Promise<void>>();
const stored = new Set<string>();
const notify = (event: string) => { if (typeof window !== 'undefined') window.dispatchEvent(new Event(event)); };

async function photoTransaction<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore, done: (value: T) => void) => void): Promise<T> {
  return withRequestDeadline(signal => new Promise<T>((resolve, reject) => {
    const open = indexedDB.open('kalo-meal-photos', 1);
    open.onupgradeneeded = () => open.result.createObjectStore('photos');
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result;
      if (signal.aborted) { db.close(); reject(signal.reason); return; }
      let transaction: IDBTransaction;
      try { transaction = db.transaction('photos', mode); }
      catch (error) { db.close(); reject(error); return; }
      let value: T;
      const cancel = () => transaction.abort();
      signal.addEventListener('abort', cancel, { once: true });
      const cleanup = () => { signal.removeEventListener('abort', cancel); db.close(); };
      transaction.oncomplete = () => { cleanup(); resolve(value); };
      transaction.onabort = transaction.onerror = () => { cleanup(); reject(transaction.error || new Error('Photo storage unavailable')); };
      try { operation(transaction.objectStore('photos'), result => { value = result; }); }
      catch (error) { transaction.abort(); reject(error); }
    };
  }), 8000);
}

export function compactMeal(item: LoggedItem): LoggedItem {
  if (!item.imageUrl?.startsWith('data:')) return item;
  const { imageUrl: _image, ...metadata } = item;
  return { ...metadata, photoId: item.photoId || `meal-${item.foodId}` };
}

export function mealForStorage(item: LoggedItem): LoggedItem {
  const compact = compactMeal(item);
  // Keep a legacy inline photo until its separate copy has actually committed.
  return item.imageUrl?.startsWith('data:') && !item.photoId && !stored.has(compact.photoId!) ? item : compact;
}

export function archiveMealPhotos(items: LoggedItem[]) {
  const writes: Promise<void>[] = [];
  for (const item of items) {
    if (!item.imageUrl?.startsWith('data:')) continue;
    const photoId = compactMeal(item).photoId!;
    if (stored.has(photoId)) continue;
    let write = pending.get(photoId);
    if (!write) {
      write = photoTransaction<void>('readwrite', store => { store.put(item.imageUrl, photoId); })
        .then(() => { stored.add(photoId); notify('kalo-photos-ready'); })
        .finally(() => pending.delete(photoId));
      pending.set(photoId, write);
    }
    writes.push(write);
  }
  return Promise.all(writes).then(() => {});
}

export async function hydrateMealPhotos(items: LoggedItem[]) {
  const missing = items.filter(item => item.photoId && !item.imageUrl);
  if (!missing.length) return items;
  const photos = await photoTransaction<Map<string, string>>('readonly', (store, done) => {
    const values = new Map<string, string>();
    done(values);
    for (const photoId of new Set(missing.map(item => item.photoId!))) {
      const request = store.get(photoId);
      request.onsuccess = () => { if (typeof request.result === 'string' && request.result) values.set(photoId, request.result); };
    }
  });
  // A missing archive must not look like a state change and restart hydration.
  if (!photos.size) return items;
  return items.map(item => photos.has(item.photoId!) ? { ...item, imageUrl: photos.get(item.photoId!) } : item);
}

export function queueMealPhotos(items: LoggedItem[]) {
  void archiveMealPhotos(items).catch(() => notify('kalo-photo-save-failed'));
}
