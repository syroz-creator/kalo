import { getTodayKey } from '../utils/date';

export function watchCalendarDay(onChange: (next: string, previous: string) => void, readDay = getTodayKey) {
  let day = readDay();
  let timer: ReturnType<typeof setTimeout>;
  const check = () => {
    clearTimeout(timer);
    if (document.visibilityState === 'visible') {
      const next = readDay();
      if (next !== day) { const previous = day; day = next; onChange(next, previous); }
    }
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    timer = setTimeout(check, midnight.getTime() - now.getTime() + 100);
  };
  check();
  window.addEventListener('pageshow', check);
  document.addEventListener('visibilitychange', check);
  return () => { clearTimeout(timer); window.removeEventListener('pageshow', check); document.removeEventListener('visibilitychange', check); };
}
