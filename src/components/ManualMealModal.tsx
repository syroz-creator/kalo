import { useEffect, useRef, useState } from 'react';
import { AlertCircle, ChevronLeft, Check, Loader2, Sparkles, X } from 'lucide-react';
import type { LoggedItem, MealAnalysisResult, MealType } from '../types';
import { useDialogFocus } from '../utils/useDialogFocus';
import { analyzeMealDescription } from '../services/mealApi';
import { getUserErrorMessage } from '../utils/userFacingError';

export function ManualMealModal({ meal: initialMeal, initialMode = 'manual', date, onClose, onLog }: { meal: MealType; initialMode?: 'manual' | 'describe'; date: string; onClose: () => void; onLog: (item: Omit<LoggedItem, 'id' | 'createdAt'>) => void }) {
  const [meal, setMeal] = useState(initialMeal);
  const [mode, setMode] = useState(initialMode);
  const [description, setDescription] = useState('');
  const [estimate, setEstimate] = useState<MealAnalysisResult | null>(null);
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
      setEstimate(result); setName(result.dishName);
      setNutrition({ calories: String(result.totalCalories), protein: String(result.totalProtein), carbs: String(result.totalCarbs), fat: String(result.totalFat) });
    } catch (failure) {
      if (!controller.signal.aborted) setError(getUserErrorMessage(failure, 'We could not estimate this meal. Please try again, or log it manually.'));
    } finally { if (!controller.signal.aborted) setEstimating(false); }
  };
  const cancelEstimate = () => { request.current?.abort(); setEstimating(false); setError('Estimate cancelled.'); };
  const valid = !estimating && (mode === 'manual' || !!estimate) && name.trim() && nutrition.calories !== '' && Object.values(nutrition).every(value => (mode === 'manual' || value.trim() !== '') && Number.isFinite(Number(value)) && Number(value) >= 0);
  return (
    <form ref={dialogRef} className="detail-page manual-page" role="dialog" aria-modal="true" aria-labelledby="manual-title" onSubmit={event => {
      event.preventDefault();
      if (!valid) return;
      const values = { calories: Math.round(Number(nutrition.calories)), protein: Number(nutrition.protein), carbs: Number(nutrition.carbs), fat: Number(nutrition.fat) };
      const bases = estimate && { calories: estimate.totalCalories, protein: estimate.totalProtein, carbs: estimate.totalCarbs, fat: estimate.totalFat };
      const ingredients = estimate && bases ? estimate.items.map(item => ({ ...item, ...Object.fromEntries((['calories', 'protein', 'carbs', 'fat'] as const).map(field => [field, bases[field] > 0 ? item[field] * values[field] / bases[field] : values[field] / estimate.items.length])) })) : undefined;
      onLog({ date, meal, name: name.trim(), foodId: `${estimate ? 'ai-text' : 'manual'}-${Date.now()}`, quantity: 1, unit: ingredients?.map(item => `${item.name} (${item.portion})`).join(', ') || 'serving', source: estimate ? 'ai_text' : 'custom', ...values, ingredients });
      onClose();
    }}>
      <div className="detail-scroll">
        <button type="button" className="text-back" onClick={onClose}><ChevronLeft size={19} />Today</button>
        <h1 id="manual-title">Log a meal</h1>
        <fieldset className="meal-segments meal-input-modes"><legend className="sr-only">Meal entry</legend><div>{(['describe', 'manual'] as const).map(value => <button type="button" key={value} disabled={estimating} aria-pressed={mode === value} className={mode === value ? 'is-selected' : ''} onClick={() => { setMode(value); setError(''); }}>{value === 'describe' ? 'Describe' : 'Manual'}</button>)}</div></fieldset>
        {mode === 'describe' && <>
          <div className="app-field"><label htmlFor="meal-description">Meal description</label><textarea id="meal-description" ref={descriptionInput} autoFocus={initialMode === 'describe'} value={description} disabled={estimating} maxLength={2000} rows={4} placeholder="e.g. 200 g grilled chicken, 1 cup rice, salad and 1 tbsp olive oil" onChange={event => {
            setDescription(event.target.value); setError('');
            if (estimate) { setEstimate(null); setName(''); setNutrition({ calories: '', protein: '', carbs: '', fat: '' }); }
          }} /></div>
          {estimating ? <div className="meal-scan__status" role="status"><Loader2 size={20} className="animate-spin" /><span>Estimating your meal...</span><button type="button" className="icon-command" aria-label="Cancel estimate" title="Cancel estimate" onClick={cancelEstimate}><X size={20} /></button></div>
            : <button type="button" className="primary-command" disabled={!description.trim()} onClick={() => void estimateMeal()}><Sparkles size={18} />{error ? 'Try again' : 'Estimate nutrition'}</button>}
          {error && <div ref={errorMessage} className="meal-scan__error" role="alert"><AlertCircle size={20} /><p>{error}</p></div>}
          {estimate && <section className="meal-estimate" aria-label="Estimated meal"><h2>{estimate.dishName}</h2><p className="detail-calories"><strong>{Math.round(Number(nutrition.calories) || 0)}</strong> kcal</p><ul className="recipe-ingredients">{estimate.items.map((item, index) => <li key={index}><span><strong>{item.name}</strong><small>{item.portion}</small></span><span>{Math.round(item.calories)} kcal</span></li>)}</ul>{estimate.notes && <p className="settings-note">{estimate.notes}</p>}</section>}
        </>}
        {(mode === 'manual' || estimate) && <label className="app-field">Meal name<input autoFocus={initialMode === 'manual' && mode === 'manual'} required value={name} onChange={event => setName(event.target.value)} placeholder="e.g. Eggs on toast" /></label>}
        <label className="app-field">Meal<select value={meal} onChange={event => setMeal(event.target.value as MealType)}>{['breakfast', 'lunch', 'dinner', 'snacks'].map(value => <option key={value} value={value}>{value.charAt(0).toUpperCase() + value.slice(1)}</option>)}</select></label>
        {(mode === 'manual' || estimate) && <div className="manual-nutrients">{(['calories', 'protein', 'carbs', 'fat'] as const).map(key => <label key={key} className="app-field">{key.charAt(0).toUpperCase() + key.slice(1)} ({key === 'calories' ? 'kcal' : 'g'})<input type="number" inputMode="decimal" min={0} step={key === 'calories' ? 1 : 0.1} required={key === 'calories' || !!estimate} value={nutrition[key]} onChange={event => setNutrition({ ...nutrition, [key]: event.target.value })} placeholder="0" /></label>)}</div>}
        {estimate && <p className="settings-note">Estimated nutrition</p>}
      </div>
      <footer className="detail-footer"><button type="submit" disabled={!valid} className="primary-command"><Check size={18} />Log meal</button></footer>
    </form>
  );
}
