import { t } from '../i18n';
import { useEffect, useRef, useState } from 'react';
import { AlertCircle, ChevronLeft, Check, Loader2, Sparkles, X } from 'lucide-react';
import type { AnalyzedFoodItem, LoggedItem, MealAnalysisResult, MealType } from '../types';
import { useDialogFocus } from '../utils/useDialogFocus';
import { analyzeMealDescription } from '../services/mealApi';
import { getUserErrorMessage } from '../utils/userFacingError';
import { MealPortionEditor } from './MealPortionEditor';
import { totalFoodNutrition } from '../utils/mealPortions';
import { getGeminiKey } from '../services/mealApi';
import { GeminiKeySettings } from './GeminiKeySettings';

export function ManualMealModal({ meal: initialMeal, initialMode = 'manual', date, onClose, onLog }: { meal: MealType; initialMode?: 'manual' | 'describe'; date: string; onClose: () => void; onLog: (item: Omit<LoggedItem, 'id' | 'createdAt'>) => Promise<boolean> }) {
  const [connected, setConnected] = useState(() => !!getGeminiKey());
  const [saving, setSaving] = useState(false);
  const [meal, setMeal] = useState(initialMeal);
  const [mode, setMode] = useState(initialMode);
  const [description, setDescription] = useState('');
  const [estimate, setEstimate] = useState<MealAnalysisResult | null>(null);
  const [editedItems, setEditedItems] = useState<AnalyzedFoodItem[]>([]);
  const [estimating, setEstimating] = useState(false);
  const [error, setError] = useState('');
  const errorMessage = useRef<HTMLDivElement>(null);
  const request = useRef<AbortController | null>(null);
  const descriptionInput = useRef<HTMLTextAreaElement>(null);
  const dialogRef = useDialogFocus(true, onClose);
  const [name, setName] = useState('');
  const [nutrition, setNutrition] = useState({ calories: '', protein: '', carbs: '', fat: '' });
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => { if (error) errorMessage.current?.scrollIntoView({ block: 'nearest' }); }, [error]);
  const estimateMeal = async () => {
    if (!description.trim()) return;
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    descriptionInput.current?.blur();
    setEstimating(true); setError(''); setEstimate(null); setName('');
    setNutrition({ calories: '', protein: '', carbs: '', fat: '' });
    try {
      const result = await analyzeMealDescription(description, controller.signal);
      if (controller.signal.aborted) return;
      setEstimate(result); setEditedItems(result.items); setName(result.dishName);
      setNutrition({ calories: String(result.totalCalories), protein: String(result.totalProtein), carbs: String(result.totalCarbs), fat: String(result.totalFat) });
    } catch (failure) {
      if (!controller.signal.aborted) setError(getUserErrorMessage(failure, 'We could not estimate this meal. Please try again, or log it manually.'));
    } finally { if (!controller.signal.aborted) setEstimating(false); }
  };
  const cancelEstimate = () => { request.current?.abort(); setEstimating(false); setError('Estimate cancelled.'); };
  const valid = !estimating && (mode === 'manual' || (!!estimate && editedItems.some(item => item.portionQuantity !== 0))) && name.trim() && nutrition.calories !== '' && Object.values(nutrition).every(value => (mode === 'manual' || value.trim() !== '') && Number.isFinite(Number(value)) && Number(value) >= 0);
  return (
    <form ref={dialogRef} className="detail-page manual-page" role="dialog" aria-modal="true" aria-labelledby="manual-title" onSubmit={async event => {
      event.preventDefault();
      if (!valid || saving) return;
      const values = { calories: Math.round(Number(nutrition.calories)), protein: Number(nutrition.protein), carbs: Number(nutrition.carbs), fat: Number(nutrition.fat) };
      const activeItems = editedItems.filter(item => item.portionQuantity !== 0);
      const bases = estimate && totalFoodNutrition(activeItems);
      const ingredients = estimate && bases ? activeItems.map(item => ({ ...item, ...Object.fromEntries((['calories', 'protein', 'carbs', 'fat'] as const).map(field => [field, bases[field] > 0 ? item[field] * values[field] / bases[field] : values[field] / activeItems.length])) })) : undefined;
      setSaving(true);
      try { if (await onLog({ date, meal, name: name.trim(), foodId: `${estimate ? 'ai-text' : 'manual'}-${Date.now()}`, quantity: 1, unit: ingredients?.map(item => `${item.name} (${item.portion})`).join(', ') || 'serving', source: estimate ? 'ai_text' : 'custom', ...values, ingredients })) onClose(); }
      finally { setSaving(false); }
    }}>
      <div className="detail-scroll">
        <button type="button" className="text-back" onClick={onClose}><ChevronLeft size={19} />{t("Today")}</button>
        <h1 id="manual-title">{t("Log a meal")}</h1>
        <fieldset className="meal-segments meal-input-modes"><legend className="sr-only">{t("Meal entry")}</legend><div>{(['describe', 'manual'] as const).map(value => <button type="button" key={value} disabled={estimating} aria-pressed={mode === value} className={mode === value ? 'is-selected' : ''} onClick={() => { setMode(value); setError(''); }}>{value === 'describe' ? t('Describe') : t('Manual')}</button>)}</div></fieldset>
        {mode === 'describe' && !connected && <GeminiKeySettings inline onBack={() => setMode('manual')} onConnected={() => setConnected(true)} />}
        {mode === 'describe' && connected && <>
          <div className="app-field"><label htmlFor="meal-description">{t("Meal description")}</label><textarea id="meal-description" ref={descriptionInput} autoFocus={initialMode === 'describe'} value={description} disabled={estimating} maxLength={2000} rows={4} placeholder={t("e.g. 200 g grilled chicken, 1 cup rice, salad and 1 tbsp olive oil")} onChange={event => {
            setDescription(event.target.value); setError('');
            if (estimate) { setEstimate(null); setName(''); setNutrition({ calories: '', protein: '', carbs: '', fat: '' }); }
          }} /></div>
          {estimating ? <div className="meal-scan__status" role="status"><Loader2 size={20} className="animate-spin" /><span>{t("Estimating your meal...")}</span><button type="button" className="icon-command" aria-label={t("Cancel estimate")} title={t("Cancel estimate")} onClick={cancelEstimate}><X size={20} /></button></div>
            : <button type="button" className="primary-command" disabled={!description.trim()} onClick={() => void estimateMeal()}><Sparkles size={18} />{error ? t('Try again') : t('Estimate nutrition')}</button>}
          {error && <div ref={errorMessage} className="meal-scan__error" role="alert"><AlertCircle size={20} /><p>{t(String(error))}</p></div>}
          {estimate && <section className="meal-estimate" aria-label={t("Estimated meal")}><h2>{estimate.dishName}</h2><p className="detail-calories"><strong>{Math.round(Number(nutrition.calories) || 0)}</strong> {t("kcal")}</p><MealPortionEditor items={estimate.items} onChange={items => { setEditedItems(items); const totals = totalFoodNutrition(items); setNutrition({ calories: String(totals.calories), protein: String(totals.protein), carbs: String(totals.carbs), fat: String(totals.fat) }); }} />{estimate.notes && <p className="settings-note">{estimate.notes}</p>}</section>}
        </>}
        {(mode === 'manual' || estimate) && <label className="app-field">{t("Meal name")}<input autoFocus={initialMode === 'manual' && mode === 'manual'} required value={name} onChange={event => setName(event.target.value)} placeholder={t("e.g. Eggs on toast")} /></label>}
        <label className="app-field">{t("Meal")}<select value={meal} onChange={event => setMeal(event.target.value as MealType)}>{['breakfast', 'lunch', 'dinner', 'snacks'].map(value => <option key={value} value={value}>{t(value.charAt(0).toUpperCase() + value.slice(1))}</option>)}</select></label>
        {(mode === 'manual' || estimate) && <div className="manual-nutrients">{(['calories', 'protein', 'carbs', 'fat'] as const).map(key => <label key={key} className="app-field">{t(key.charAt(0).toUpperCase() + key.slice(1))} ({key === 'calories' ? t('kcal') : t('g')})<input type="number" inputMode="decimal" min={0} step={key === 'calories' ? 1 : 0.1} required={key === 'calories' || !!estimate} value={nutrition[key]} onChange={event => setNutrition({ ...nutrition, [key]: event.target.value })} placeholder="0" /></label>)}</div>}
        {estimate && <p className="settings-note">{t("Estimated nutrition")}</p>}
      </div>
      <footer className="detail-footer"><button type="submit" disabled={!valid || saving} className="primary-command">{saving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}{saving ? t('Saving...') : t('Log meal')}</button></footer>
    </form>
  );
}
