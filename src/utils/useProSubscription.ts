import { useEffect, useSyncExternalStore } from 'react';
import { proSubscription } from '../services/proSubscription';

export function useProSubscription() {
  const state = useSyncExternalStore(proSubscription.subscribe, proSubscription.getSnapshot, proSubscription.getSnapshot);
  useEffect(() => {
    const refresh = () => { void proSubscription.refresh().catch(() => {}); };
    const visible = () => { if (document.visibilityState === 'visible') refresh(); };
    refresh();
    const listener = proSubscription.watch(refresh)?.catch(() => null);
    document.addEventListener('visibilitychange', visible);
    return () => { void listener?.then(handle => handle?.remove()).catch(() => {}); document.removeEventListener('visibilitychange', visible); };
  }, []);
  useEffect(() => {
    if (!state.isPro || !state.expiresAt || state.expiresAt <= Date.now()) return;
    const timer = window.setTimeout(() => { void proSubscription.refresh().catch(() => {}); }, Math.min(state.expiresAt - Date.now() + 100, 2147483647));
    return () => window.clearTimeout(timer);
  }, [state.isPro, state.expiresAt]);
  return state;
}
