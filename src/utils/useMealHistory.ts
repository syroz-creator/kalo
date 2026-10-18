import { useCallback, useEffect, useRef, useState } from 'react';
import type { LoggedItem } from '../types';
import { loadLoggedItems, readLoggedHistory, saveLoggedItems } from '../services/storage';
import { hydrateMealPhotos, queueMealPhotos } from '../services/mealPhotoStore';
import { getUserErrorMessage } from './userFacingError';

export function useMealHistory(photosEnabled = true) {
  const recoveryNotice = 'Kalo opened a previous saved copy of your meals. Some recent entries may be missing. Export a backup before clearing anything.';
  const [initial] = useState(() => {
    try { const saved = readLoggedHistory(); return { items: saved.items, error: saved.recovered ? recoveryNotice : '' }; }
    catch (error) { return { items: [] as LoggedItem[], error: getUserErrorMessage(error, 'Your saved meals could not be opened.') }; }
  });
  const [items, setItems] = useState(initial.items);
  const [error, setError] = useState(initial.error);
  const current = useRef(items);
  const revision = useRef(0);
  const withPhotos = useCallback((meals: LoggedItem[]) => {
    const photos = new Map(current.current.filter(item => item.imageUrl).map(item => [item.photoId || item.foodId, item.imageUrl]));
    return meals.map(item => !item.imageUrl && photos.has(item.photoId || item.foodId) ? { ...item, imageUrl: photos.get(item.photoId || item.foodId) } : item);
  }, []);
  const hydrate = useCallback((meals: LoggedItem[]) => {
    if (!photosEnabled) return;
    const version = ++revision.current;
    void hydrateMealPhotos(meals).then(hydrated => {
      if (version !== revision.current || hydrated === meals) return;
      current.current = hydrated; setItems(hydrated);
    }).catch(() => setError('Your meal records are saved, but some photos could not be opened. Export a backup before clearing any data.'));
  }, [photosEnabled]);
  useEffect(() => {
    if (photosEnabled) {
      queueMealPhotos(current.current);
      hydrate(current.current);
    }
    const reload = () => {
      try { const saved = readLoggedHistory(); const latest = withPhotos(saved.items); current.current = latest; setItems(latest); hydrate(latest); if (saved.recovered) setError(recoveryNotice); }
      catch (failure) { setError(getUserErrorMessage(failure, 'Your saved meals could not be opened.')); }
    };
    const storage = (event: StorageEvent) => { if (event.key === 'kalo_logged_items_v2' || event.key === null) reload(); };
    const visible = () => { if (document.visibilityState === 'visible') reload(); };
    const photoFailure = () => setError('Your meal records are saved, but a photo could not be saved. Export a backup before closing Kalo.');
    const photosReady = () => hydrate(current.current);
    window.addEventListener('storage', storage);
    window.addEventListener('pageshow', reload);
    document.addEventListener('visibilitychange', visible);
    window.addEventListener('kalo-photo-save-failed', photoFailure);
    window.addEventListener('kalo-photos-ready', photosReady);
    window.addEventListener('kalo-data-restored', reload);
    return () => {
      revision.current++;
      window.removeEventListener('storage', storage);
      window.removeEventListener('pageshow', reload);
      document.removeEventListener('visibilitychange', visible);
      window.removeEventListener('kalo-photo-save-failed', photoFailure);
      window.removeEventListener('kalo-photos-ready', photosReady);
      window.removeEventListener('kalo-data-restored', reload);
    };
  }, [hydrate, withPhotos, photosEnabled]);
  const update = useCallback((change: (previous: LoggedItem[]) => LoggedItem[]) => {
    try {
      // Read the saved copy at action time, so a resumed tab cannot overwrite newer meals.
      const next = change(withPhotos(loadLoggedItems()));
      saveLoggedItems(next);
      current.current = next; setItems(next); setError(''); hydrate(next);
      return true;
    } catch (failure) { setError(getUserErrorMessage(failure, 'This change was not saved. Your previous meals are safe.')); return false; }
  }, [hydrate, withPhotos]);
  return { items, update, error, setError };
}
