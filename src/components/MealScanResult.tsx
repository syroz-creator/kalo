import { useRef, useState } from 'react';
import { Bookmark, BookmarkCheck, Check, ChevronDown, Droplets, Loader2, Plus, RefreshCw, SlidersHorizontal, SquarePen, X } from 'lucide-react';
import { t } from '../i18n';
import type { AnalyzedFoodItem, MealAnalysisResult, MealType } from '../types';
import { MealPortionEditor } from './MealPortionEditor';
import { MealIngredientForm } from './MealIngredientForm';
import { maxScanWaterMl, waterSlotMl } from '../utils/water';

export interface ScanDraftFields {
  meal: MealType;
  name: string;
  details: string;
  waterMl: string;
  nutrition: Record<'calories' | 'protein' | 'carbs' | 'fat', string>;
}

interface Props {
  result: MealAnalysisResult;
  items: AnalyzedFoodItem[];
  draft: ScanDraftFields;
  onChange: (changes: Partial<ScanDraftFields>) => void;
  onItemsChange: (items: AnalyzedFoodItem[]) => void;
  onAddIngredient: (item: AnalyzedFoodItem) => void;
  onRefine: () => void;
  onLog: () => void;
  onSave: () => void;
  onRetake: () => void;
  onClose: () => void;
  valid: boolean;
  canRefine: boolean;
  busy: 'save' | 'log' | null;
  saved: boolean;
  error: string;
  adjusted?: boolean;
}

export function MealScanResult({ result, items, draft, onChange, onItemsChange, onAddIngredient, onRefine, onLog, onSave, onRetake, onClose, valid, canRefine, busy, saved, error, adjusted = false }: Props) {
  const [adding, setAdding] = useState(false);
  const [offset, setOffset] = useState(0);
  const drag = useRef<number | null>(null);
  const dragged = useRef(false);
  const calories = Math.round(Number(draft.nutrition.calories) || 0);
  const active = items.filter(item => item.portionQuantity !== 0);
  const hasFood = active.length > 0;
  const waterMl = Number(draft.waterMl) || 0;
  const waterCups = Number((waterMl / waterSlotMl).toFixed(2));
  const description = active.slice(0, 3).map(item => `${item.portion} ${item.name}`).join(' · ');

  return <div className="scan-result-backdrop">
    <section className="scan-result" aria-labelledby="scan-result-title" style={{ transform: offset ? `translateY(${offset}px)` : undefined }}>
      <div className="scan-result__top">
        <button type="button" className="scan-result__handle" aria-label={t('Discard meal')} title={t('Discard meal')} disabled={!!busy} onPointerDown={event => { drag.current = event.clientY; dragged.current = false; event.currentTarget.setPointerCapture(event.pointerId); }} onPointerMove={event => { if (drag.current !== null) { const distance = Math.max(0, event.clientY - drag.current); if (distance > 8) dragged.current = true; setOffset(distance); } }} onPointerUp={() => { drag.current = null; if (offset > 100) onClose(); else setOffset(0); }} onPointerCancel={() => { drag.current = null; setOffset(0); }} onClick={event => { if (!dragged.current || event.detail === 0) onClose(); }}><span /></button>
        <button type="button" className="icon-command scan-result__close" aria-label={t('Close meal photo')} title={t('Close')} disabled={!!busy} onClick={onClose}><X size={21} /></button>
      </div>
      <div className="scan-result__scroll" inert={!!busy}>
        <div className="scan-result__summary">
          <div className="scan-result__eyebrow"><span className="scan-result__estimate"><i />{t('Photo estimate')}</span>{adjusted && <span className="scan-result__adjusted">{t('Portions adjusted')}</span>}</div>
          <h1 id="scan-result-title" dir="auto">{draft.name || t('Your meal')}</h1>
          <p className="scan-result__description" dir="auto">{description || (waterMl > 0 ? t('Plain water') : t('No ingredients remaining.'))}{active.length > 3 && <> · {t('{count} more ingredients', { count: active.length - 3 })}</>}</p>
          <p className="scan-result__calories"><strong>{hasFood ? calories : waterMl}</strong><span>{hasFood || !waterMl ? t('kcal') : t('ml')}</span></p>
        </div>
        {hasFood && <div className="scan-result__macros">{(['protein', 'carbs', 'fat'] as const).map(field => <div className={`scan-macro scan-macro--${field}`} key={field}><i /><span>{t(field.charAt(0).toUpperCase() + field.slice(1))}</span><strong>{Number(Number(draft.nutrition[field] || 0).toFixed(1))}</strong><small>{t('g')}</small></div>)}</div>}
        <div className="scan-assumptions"><strong>{t('Original portion assumptions')}</strong><p>{t('Estimated from a photo, not measured.')}</p>{result.notes && <p dir="auto">{result.notes}</p>}{result.referenceTip && <p dir="auto">{result.referenceTip}</p>}</div>
        {(result.waterMl ?? 0) > 0 && <label className="scan-water"><Droplets size={23} /><span className="scan-water__copy"><strong>{t('Water estimate')}</strong><small>{waterCups === 1 ? t('About 1 cup') : t('About {cups} cups', { cups: waterCups })}</small></span><span className="scan-water__amount"><input aria-label={t('Water amount (ml)')} type="number" inputMode="decimal" min="0" max={maxScanWaterMl} step="any" value={draft.waterMl} onChange={event => onChange({ waterMl: event.target.value })} /><span>{t('ml')}</span></span></label>}
        {!!result.items.length && <h2 className="scan-result__ingredients-title">{t('Ingredients')}</h2>}
        <MealPortionEditor items={result.items} onChange={onItemsChange} compact removable />
        {!active.length && !!result.items.length && <p className="settings-note">{t('No ingredients remaining.')}</p>}
        {adding ? <MealIngredientForm onAdd={item => { onAddIngredient(item); setAdding(false); }} onCancel={() => setAdding(false)} /> : <button type="button" className="scan-result__action" onClick={() => setAdding(true)}><Plus size={21} />{t('Add ingredient')}</button>}
        <details className="scan-result__correction"><summary><SlidersHorizontal size={19} /><span>{t('Adjust this estimate')}</span><ChevronDown size={18} /></summary><div className="app-field"><label htmlFor="photo-portion-details">{t('Portion or label details (optional)')}</label><textarea id="photo-portion-details" rows={2} maxLength={2000} value={draft.details} placeholder={t('e.g. 2 biscuits, 25 g total; label: 124 kcal per packet')} onChange={event => onChange({ details: event.target.value })} /></div><button type="button" className="primary-command" disabled={!canRefine} onClick={onRefine}><RefreshCw size={18} />{t('Update estimate')}</button></details>
        {hasFood && <><label className="scan-result__meal">{t('Meal')}<select value={draft.meal} onChange={event => onChange({ meal: event.target.value as MealType })}>{(['breakfast', 'lunch', 'dinner', 'snacks'] as const).map(value => <option key={value} value={value}>{t(value.charAt(0).toUpperCase() + value.slice(1))}</option>)}</select></label>
        <details className="scan-result__manual"><summary><SquarePen size={18} /><span>{t('Edit nutrition')}</span><ChevronDown size={18} /></summary><label className="app-field">{t('Meal name')}<input value={draft.name} onChange={event => onChange({ name: event.target.value })} /></label><div className="manual-nutrients">{(['calories', 'protein', 'carbs', 'fat'] as const).map(field => <label className="app-field" key={field}>{t(field.charAt(0).toUpperCase() + field.slice(1))} ({field === 'calories' ? t('kcal') : t('g')})<input type="number" inputMode="decimal" min="0" step="any" value={draft.nutrition[field]} onChange={event => onChange({ nutrition: { ...draft.nutrition, [field]: event.target.value } })} /></label>)}</div></details></>}
        {error && <p className="scan-result__error" role="alert">{t(String(error))}</p>}
      </div>
      <footer className="scan-result__footer"><button type="button" className="primary-command scan-result__log" disabled={!valid || !!busy || adding} onClick={onLog}>{busy === 'log' ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} />}{busy === 'log' ? t('Saving...') : hasFood ? t('Log meal · {calories} kcal', { calories }) : t('Log water · {amount} ml', { amount: waterMl })}</button><div className="scan-result__secondary">{hasFood && <button type="button" className={`scan-result__save${saved ? ' is-saved' : ''}`} disabled={!valid || !!busy || saved || adding} onClick={onSave}>{busy === 'save' ? <Loader2 size={18} className="animate-spin" /> : saved ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}{saved ? t('Saved') : t('Save to Recipes')}</button>}<button type="button" className="scan-result__retake" disabled={!!busy} onClick={onRetake}><RefreshCw size={17} />{t('Take another photo')}</button></div></footer>
    </section>
  </div>;
}
