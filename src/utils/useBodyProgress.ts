import { useCallback, useEffect, useRef, useState } from 'react';
import type { BodyProgressPhoto } from '../types';
import { deleteBodyPhoto, loadBodyPhotos, saveBodyPhoto } from '../services/bodyProgress';
import { getUserErrorMessage } from './userFacingError';

export function useBodyProgress() {
  const [photos, setPhotos] = useState<BodyProgressPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const version = useRef(0);
  const refresh = useCallback(async () => {
    const request = ++version.current;
    try {
      const records = await loadBodyPhotos();
      if (request === version.current) { setPhotos(records); setError(''); }
    } catch (failure) {
      if (request === version.current) setError(getUserErrorMessage(failure, 'Your progress photos could not be opened. They have not been deleted. Please try again.'));
    } finally { if (request === version.current) setLoading(false); }
  }, []);
  useEffect(() => {
    void refresh();
    const visible = () => { if (document.visibilityState === 'visible') void refresh(); };
    document.addEventListener('visibilitychange', visible);
    window.addEventListener('pageshow', refresh);
    return () => { version.current++; document.removeEventListener('visibilitychange', visible); window.removeEventListener('pageshow', refresh); };
  }, [refresh]);
  const save = async (photo: BodyProgressPhoto, replace: boolean) => {
    await saveBodyPhoto(photo, replace);
    setPhotos(previous => [...previous.filter(item => item.date !== photo.date), photo].sort((a, b) => a.date.localeCompare(b.date)));
    void refresh();
  };
  const remove = async (date: string) => {
    await deleteBodyPhoto(date);
    setPhotos(previous => previous.filter(photo => photo.date !== date));
    void refresh();
  };
  return { photos, loading, error, refresh, save, remove };
}
