import type { BodyProgressPhoto } from '../types';
import { validBodyPhoto } from '../utils/bodyProgress';
import { getTodayKey } from '../utils/date';
import { UserFacingError } from '../utils/userFacingError';
import { withRequestDeadline } from './requestDeadline';

async function transaction<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore, done: (value: T) => void) => void): Promise<T> {
  return withRequestDeadline(signal => new Promise<T>((resolve, reject) => {
    const open = indexedDB.open('kalo-body-progress', 1);
    let blocked = false;
    open.onupgradeneeded = () => open.result.createObjectStore('photos', { keyPath: 'date' });
    open.onerror = () => reject(open.error);
    open.onblocked = () => { blocked = true; reject(new Error('Photo storage blocked')); };
    open.onsuccess = () => {
      const db = open.result;
      if (signal.aborted || blocked) { db.close(); reject(signal.reason || new Error('Photo storage blocked')); return; }
      let tx: IDBTransaction;
      try { tx = db.transaction('photos', mode); }
      catch (error) { db.close(); reject(error); return; }
      let value: T;
      const cancel = () => tx.abort();
      signal.addEventListener('abort', cancel, { once: true });
      const cleanup = () => { signal.removeEventListener('abort', cancel); db.close(); };
      tx.oncomplete = () => { cleanup(); resolve(value); };
      tx.onabort = tx.onerror = () => { cleanup(); reject(tx.error || new Error('Photo storage unavailable')); };
      try { operation(tx.objectStore('photos'), result => { value = result; }); }
      catch (error) { tx.abort(); reject(error); }
    };
  }), 8000);
}

export async function loadBodyPhotos(): Promise<BodyProgressPhoto[]> {
  try {
    const photos = await transaction<unknown[]>('readonly', (store, done) => {
      const request = store.getAll();
      request.onsuccess = () => done(request.result);
    });
    if (!photos.every(validBodyPhoto)) throw new Error('Unreadable progress photos');
    return photos.sort((a, b) => a.date.localeCompare(b.date));
  } catch { throw new UserFacingError('Your progress photos could not be opened. They have not been deleted. Please try again.'); }
}

export async function saveBodyPhoto(photo: BodyProgressPhoto, replace = false) {
  if (!validBodyPhoto(photo) || photo.date > getTodayKey()) throw new UserFacingError('Choose a valid photo and a date that is not in the future.');
  try {
    await transaction<void>('readwrite', store => { if (replace) store.put(photo); else store.add(photo); });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'ConstraintError') throw new UserFacingError('A progress photo already exists for this date. Reopen the photo form to replace it.');
    throw new UserFacingError('Your progress photo was not saved. Please free some device storage and try again.');
  }
}

export async function deleteBodyPhoto(date: string) {
  try { await transaction<void>('readwrite', store => { store.delete(date); }); }
  catch { throw new UserFacingError('Your progress photo could not be deleted. Please try again.'); }
}

export async function mergeBodyPhotos(photos: BodyProgressPhoto[], commitRecords: () => () => void) {
  let rollback: (() => void) | undefined;
  try {
    await transaction<void>('readwrite', store => {
      const request = store.getAllKeys();
      request.onsuccess = () => {
        try {
          const existing = new Set(request.result);
          for (const photo of photos) if (!existing.has(photo.date)) store.add(photo);
          // Commit metadata only after all photo writes succeed; abort both on failure.
          const checkpoint = store.count();
          checkpoint.onsuccess = () => {
            try { rollback = commitRecords(); }
            catch { store.transaction.abort(); }
          };
        } catch { store.transaction.abort(); }
      };
    });
  } catch (failure) { rollback?.(); throw failure; }
}
