import { useMemo, useRef, useState } from 'react';
import { Loader2, Plus, Search, X } from 'lucide-react';
import type { LoggedItem, MealType } from '../types';
import { t, getLocale } from '../i18n';
import { useDialogFocus } from '../utils/useDialogFocus';
import { repeatMealChoices } from '../utils/repeatMeals';
import { parseDateKey } from '../utils/date';

export function RepeatMealSheet({ history, date, onLog, onClose }: { history: LoggedItem[]; date: string; onLog: (item: LoggedItem, meal: MealType) => Promise<boolean>; onClose: () => void }) {
  const [mode, setMode] = useState<'recent' | 'frequent'>('recent');
  const [query, setQuery] = useState('');
  const [meal, setMeal] = useState<MealType>(() => { const h = new Date().getHours(); return h < 11 ? 'breakfast' : h < 16 ? 'lunch' : h < 21 ? 'dinner' : 'snacks'; });
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const lock = useRef(false);
  const close = () => { if (!lock.current) onClose(); };
  const dialog = useDialogFocus<HTMLDivElement>(true, close);
  const choices = useMemo(() => repeatMealChoices(history, mode, query), [history, mode, query]);
  return <div className="repeat-backdrop" onClick={event => { if (event.target === event.currentTarget) close(); }}>
    <div ref={dialog} className="repeat-sheet" role="dialog" aria-modal="true" aria-labelledby="repeat-title">
      <header><div><h1 id="repeat-title">{t('Log again')}</h1><p>{parseDateKey(date).toLocaleDateString(getLocale(), { month: 'short', day: 'numeric' })}</p></div><button type="button" className="icon-command" aria-label={t('Close')} title={t('Close')} disabled={!!busy} onClick={close}><X size={21} /></button></header>
      <div className="repeat-fields"><label className="repeat-search"><Search size={18} /><input type="search" aria-label={t('Search past meals')} placeholder={t('Search past meals')} value={query} disabled={!!busy} onChange={e => setQuery(e.target.value)} /></label>
      <label className="app-field">{t('Meal')}<select value={meal} disabled={!!busy} onChange={e => setMeal(e.target.value as MealType)}>{(['breakfast', 'lunch', 'dinner', 'snacks'] as const).map(value => <option value={value} key={value}>{t(value.charAt(0).toUpperCase() + value.slice(1))}</option>)}</select></label>
      <div className="repeat-modes" role="group" aria-label={t('Past meals')}><button type="button" aria-pressed={mode === 'recent'} onClick={() => setMode('recent')}>{t('Recent')}</button><button type="button" aria-pressed={mode === 'frequent'} onClick={() => setMode('frequent')}>{t('Frequent')}</button></div></div>
      <div className="repeat-list">{choices.map(({ item, count }) => <div className="repeat-row" key={item.id}><div><strong dir="auto">{item.name}</strong><small dir="auto">{item.quantity} {item.unit}</small><span>{Math.round(item.calories).toLocaleString(getLocale())} {t('kcal')}{mode === 'frequent' && <> · {t('Logged {count} times', { count })}</>}</span></div><button type="button" className="icon-command" disabled={!!busy} aria-label={t('Log {name} again', { name: item.name })} title={t('Log {name} again', { name: item.name })} onClick={async () => {
        if (lock.current) return;
        lock.current = true; setBusy(item.id); setError('');
        try { if (await onLog(item, meal)) onClose(); else setError('Your meal could not be saved. Please try again.'); }
        catch { setError('Your meal could not be saved. Please try again.'); }
        finally { lock.current = false; setBusy(''); }
      }}>{busy === item.id ? <Loader2 size={20} className="animate-spin" /> : <Plus size={21} />}</button></div>)}
      {!choices.length && <p className="settings-note">{t('No matching meals.')}</p>}</div>
      {error && <p role="alert" className="settings-note">{t(String(error))}</p>}
    </div>
  </div>;
}
