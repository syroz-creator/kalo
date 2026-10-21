import { useEffect, useId, useRef, useState } from 'react';
import { ArrowUpRight, Check, ChevronDown, Crown, Leaf, Loader2, Plus, Sparkles, Zap } from 'lucide-react';
import { t } from '../i18n';
import type { AnalyzedFoodItem } from '../types';
import { getMealSuggestions, type MealImprovementGoal, type MealPreferences, type MealSuggestion } from '../services/mealSuggestions';
import { proSubscription } from '../services/proSubscription';
import { useProSubscription } from '../utils/useProSubscription';
import { getUserErrorMessage } from '../utils/userFacingError';
import { ProSubscription } from './ProSubscription';

export function MealImprovements({ items, calories, onAdd }: { items: AnalyzedFoodItem[]; calories: number; onAdd: (item: AnalyzedFoodItem) => void }) {
  const subscription = useProSubscription();
  const [open, setOpen] = useState(false);
  const [showPlans, setShowPlans] = useState(false);
  const [goal, setGoal] = useState<MealImprovementGoal>('balance');
  const [preferences, setPreferences] = useState<MealPreferences>({ plantBased: false, noDairy: false, noNuts: false });
  const [suggestions, setSuggestions] = useState<MealSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [retry, setRetry] = useState(0);
  const request = useRef(0);
  const lock = useRef(false);
  const id = useId();
  const signature = JSON.stringify(items);
  const preferenceKey = JSON.stringify(preferences);
  useEffect(() => {
    const version = ++request.current;
    if (!open || !subscription.isPro) { setSuggestions([]); return; }
    setLoading(true); setError(''); setSuggestions([]);
    void getMealSuggestions(items, goal, preferences).then(values => {
      if (request.current === version) setSuggestions(values);
    }).catch(failure => {
      if (request.current === version) setError(getUserErrorMessage(failure, 'Could not load meal suggestions. Please try again.'));
    }).finally(() => { if (request.current === version) setLoading(false); });
    return () => { request.current++; };
  }, [open, subscription.isPro, goal, signature, preferenceKey, retry]);
  const add = async (suggestion: MealSuggestion) => {
    if (lock.current) return;
    lock.current = true; setAdding(true); setError('');
    const version = request.current;
    try {
      await proSubscription.requireActive();
      if (version !== request.current) return;
      onAdd({ ...suggestion.food, name: t(suggestion.name) });
      setNotice(t('{name} added to your estimate.', { name: t(suggestion.name) }));
    } catch (failure) { setError(getUserErrorMessage(failure, 'Could not load meal suggestions. Please try again.')); }
    finally { lock.current = false; setAdding(false); }
  };
  const retrySuggestions = async () => {
    setError('');
    try { await proSubscription.refresh(); setRetry(value => value + 1); }
    catch (failure) { setError(getUserErrorMessage(failure, 'Could not load meal suggestions. Please try again.')); }
  };
  return <div className="meal-coach">
    <button type="button" className="meal-coach__trigger" aria-expanded={open} aria-controls={id} onClick={() => setOpen(value => !value)}>
      <span className="meal-coach__icon"><Sparkles size={21} /></span><span><strong>{t('Improve this meal')}<span className="pro-badge">{t('PRO')}</span></strong><small>{t('Better balance or a little more energy.')}</small></span><ChevronDown size={19} className={open ? 'is-open' : ''} />
    </button>
    {open && <div className="meal-coach__body" id={id}>
      {!subscription.checked ? <p className="pro-loading" role="status"><Loader2 size={18} className="animate-spin" />{t('Checking Pro access...')}</p>
        : !subscription.isPro ? showPlans ? <ProSubscription inline onBack={() => setShowPlans(false)} /> : <div className="meal-coach__locked"><Crown size={24} /><h3>{t('Your next meal upgrade.')}</h3><p>{t('Unlock suggestions for what to add, with portions and estimated calories and macros.')}</p><button type="button" className="primary-command pro-primary" onClick={() => setShowPlans(true)}>{t('Explore Kalo Pro')}<ArrowUpRight size={18} /></button></div>
        : <>
          <div className="meal-coach__goals" role="group" aria-label={t('Meal improvement goal')}>
            <button type="button" aria-pressed={goal === 'balance'} onClick={() => { setGoal('balance'); setNotice(''); }}><Leaf size={17} />{t('Make it healthier')}</button>
            <button type="button" aria-pressed={goal === 'energy'} onClick={() => { setGoal('energy'); setNotice(''); }}><Zap size={17} />{t('Add more calories')}</button>
          </div>
          <details className="meal-coach__preferences"><summary>{t('Food preferences')}<ChevronDown size={15} /></summary><div>{(['plantBased', 'noDairy', 'noNuts'] as const).map(key => <label key={key}><input type="checkbox" checked={preferences[key]} onChange={event => setPreferences(value => ({ ...value, [key]: event.target.checked }))} />{key === 'plantBased' ? t('Plant-based') : key === 'noDairy' ? t('No dairy') : t('No nuts')}</label>)}</div></details>
          <p className="meal-coach__intro">{goal === 'balance' ? t('A few additions for a more varied, balanced meal.') : t('Easy additions when you want a more energy-dense meal.')}</p>
          {loading ? <p className="pro-loading" role="status"><Loader2 size={18} className="animate-spin" />{t('Finding your additions...')}</p> : <div className="meal-coach__suggestions">{suggestions.map(suggestion => <article className="meal-addition" key={suggestion.id}>
            <div className="meal-addition__heading"><h3>{t(suggestion.name)}</h3><strong><bdi dir="ltr">+{suggestion.food.calories}</bdi><small>{t('kcal')}</small></strong></div>
            <p className="meal-addition__portion">{suggestion.food.portionQuantity} {t('g')}</p><p>{t(suggestion.reason)}</p>
            <dl className="meal-addition__macros">{(['protein', 'carbs', 'fat'] as const).map(field => <div key={field}><dt>{field === 'protein' ? t('Protein') : field === 'carbs' ? t('Carbs') : t('Fat')}</dt><dd><bdi dir="ltr">+{suggestion.food[field]}</bdi> {t('g')}</dd></div>)}</dl>
            <div className="meal-addition__footer"><small>{t('Meal with this: {calories} kcal', { calories: Math.round(calories + suggestion.food.calories) })}</small><button type="button" disabled={adding} onClick={() => void add(suggestion)}><Plus size={16} />{t('Add to estimate')}</button></div>
          </article>)}</div>}
          {!loading && !suggestions.length && !error && <p className="pro-info">{t('No more additions match these preferences. Try changing a filter.')}</p>}
          <p className="meal-coach__note">{t('Reference portions, not a new photo measurement. Choose foods that suit your allergies. Only add what you actually include in your meal.')}</p>
        </>}
      {notice && <p className="meal-coach__notice" role="status"><Check size={16} />{notice}</p>}
      {error && <div className="pro-error" role="alert"><p>{t(error)}</p><button type="button" className="text-back" onClick={() => void retrySuggestions()}>{t('Try again')}</button></div>}
    </div>}
  </div>;
}
