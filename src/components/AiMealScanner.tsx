import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, Camera, RefreshCw, SquarePen } from 'lucide-react';
import { t } from '../i18n';
import type { AnalyzedFoodItem, MealAnalysisResult, MealScanDraft, MealType } from '../types';
import { analyzeMealPhoto } from '../services/mealApi';
import { getUserErrorMessage } from '../utils/userFacingError';
import { totalFoodNutrition } from '../utils/mealPortions';
import { useDialogFocus } from '../utils/useDialogFocus';
import { MealCamera } from './MealCamera';
import { MealScanLoading } from './MealScanLoading';
import { MealScanResult, type ScanDraftFields } from './MealScanResult';

interface AiMealScannerProps {
  targetMeal: MealType;
  initialImage?: string | null;
  onChangeTargetMeal?: (meal: MealType) => void;
  onLogMealResult: (result: MealScanDraft) => Promise<boolean>;
  onSaveMealResult: (result: MealScanDraft) => Promise<boolean>;
  onBarcode: () => void;
  onClose: () => void;
  onNativeCameraPendingChange?: (pending: boolean) => void;
  onDescribeMeal?: () => void;
}
const fields = ['calories', 'protein', 'carbs', 'fat'] as const;
const emptyNutrition = { calories: '', protein: '', carbs: '', fat: '' };

export function AiMealScanner({ targetMeal, initialImage, onChangeTargetMeal, onLogMealResult, onSaveMealResult, onBarcode, onClose, onNativeCameraPendingChange, onDescribeMeal }: AiMealScannerProps) {
  const [photo, setPhoto] = useState<string | null>(null);
  const [result, setResult] = useState<MealAnalysisResult | null>(null);
  const [editedItems, setEditedItems] = useState<AnalyzedFoodItem[]>([]);
  const [draft, setDraft] = useState<ScanDraftFields>({ meal: targetMeal, name: '', details: '', nutrition: emptyNutrition });
  const [busy, setBusy] = useState<'save' | 'log' | null>(null);
  const [saved, setSaved] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [resultDetails, setResultDetails] = useState('');
  const request = useRef<AbortController | null>(null);
  const imageIdentity = useRef('');
  const foodId = useRef('');
  const savingRef = useRef(false);
  const close = () => { if (!savingRef.current) onClose(); };
  const dialog = useDialogFocus<HTMLDivElement>(true, close);
  const phase = analyzing ? 'loading' : result ? 'result' : photo ? 'error' : 'camera';
  useEffect(() => {
    const root = dialog.current;
    const button = Array.from(root?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? []).find(element => !element.closest('[inert]') && element.getClientRects().length > 0);
    (button ?? root)?.focus({ preventScroll: true });
  }, [phase, busy, dialog]);

  const analyze = useCallback(async (imageUrl: string, details = '') => {
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    if (imageIdentity.current !== imageUrl) {
      imageIdentity.current = imageUrl; foodId.current = `ai-${crypto.randomUUID()}`;
      setResult(null); setEditedItems([]);
    }
    setPhoto(imageUrl); setAnalyzing(true); setError(''); setSaved(false);
    setDraft(value => ({ ...value, details }));
    try {
      const data = await analyzeMealPhoto(imageUrl, controller.signal, details);
      if (controller.signal.aborted) return;
      setResult(data); setEditedItems(data.items); setResultDetails(details.trim());
      setDraft(value => ({ ...value, name: data.dishName, details, nutrition: { calories: String(data.totalCalories), protein: String(data.totalProtein), carbs: String(data.totalCarbs), fat: String(data.totalFat) } }));
    } catch (failure) {
      if (!controller.signal.aborted) setError(getUserErrorMessage(failure, 'We could not estimate this meal. Please try again, or log it manually.'));
    } finally { if (!controller.signal.aborted) setAnalyzing(false); }
  }, []);
  useEffect(() => { setDraft(value => ({ ...value, meal: targetMeal })); }, [targetMeal]);
  useEffect(() => { if (initialImage) void analyze(initialImage); return () => request.current?.abort(); }, [initialImage, analyze]);

  const change = (changes: Partial<ScanDraftFields>) => {
    setDraft(value => ({ ...value, ...changes })); setSaved(false); setError('');
    if (changes.meal) onChangeTargetMeal?.(changes.meal);
  };
  const updateItems = (items: AnalyzedFoodItem[]) => {
    setEditedItems(items);
    const totals = totalFoodNutrition(items);
    change({ nutrition: { calories: String(totals.calories), protein: String(totals.protein), carbs: String(totals.carbs), fat: String(totals.fat) } });
  };
  const addIngredient = (item: AnalyzedFoodItem) => {
    const items = [...editedItems.filter(food => food.portionQuantity !== 0), item];
    setResult(value => value ? { ...value, items } : null);
    updateItems(items);
  };
  const retake = () => {
    request.current?.abort(); setAnalyzing(false); setPhoto(null); setResult(null); setEditedItems([]); setSaved(false); setError('');
    setDraft(value => ({ ...value, name: '', details: '', nutrition: emptyNutrition }));
    setResultDetails(''); imageIdentity.current = '';
  };
  const cancelScan = () => {
    request.current?.abort(); setAnalyzing(false); setError('');
    if (result) setDraft(value => ({ ...value, details: resultDetails }));
    else retake();
  };
  const valid = draft.details.trim() === resultDetails && editedItems.some(item => item.portionQuantity !== 0) && !!draft.name.trim()
    && fields.every(field => draft.nutrition[field].trim() !== '' && Number.isFinite(Number(draft.nutrition[field])) && Number(draft.nutrition[field]) >= 0);
  const persist = async (action: 'save' | 'log') => {
    if (!result || !valid || savingRef.current) return;
    savingRef.current = true; setBusy(action); setError('');
    const values = { calories: Number(draft.nutrition.calories), protein: Number(draft.nutrition.protein), carbs: Number(draft.nutrition.carbs), fat: Number(draft.nutrition.fat) };
    const activeItems = editedItems.filter(item => item.portionQuantity !== 0);
    const bases = totalFoodNutrition(activeItems);
    const ingredients = activeItems.map(item => ({ ...item, ...Object.fromEntries(fields.map(field => [field, bases[field] > 0 ? item[field] * values[field] / bases[field] : values[field] / activeItems.length])) }));
    const entry: MealScanDraft = { foodId: foodId.current, meal: draft.meal, dishName: draft.name.trim(), totalCalories: Math.round(values.calories), totalProtein: Math.round(values.protein * 10) / 10, totalCarbs: Math.round(values.carbs * 10) / 10, totalFat: Math.round(values.fat * 10) / 10, portionDescription: ingredients.map(item => `${item.name} (${item.portion})`).join(', '), imageUrl: photo ?? undefined, ingredients };
    try {
      const success = await (action === 'save' ? onSaveMealResult(entry) : onLogMealResult(entry));
      if (success) { if (action === 'save') setSaved(true); else onClose(); }
      else setError('Your meal could not be saved. Please try again.');
    } catch (failure) { setError(getUserErrorMessage(failure, 'Your meal could not be saved. Please try again.')); }
    finally { savingRef.current = false; setBusy(null); }
  };

  return <div ref={dialog} className={`scan-workspace${photo ? ' scan-workspace--photo' : ''}`} role="dialog" aria-modal="true" aria-label={t('Meal photo')} tabIndex={-1}>
    {!photo && <MealCamera onPhoto={image => void analyze(image)} onClose={close} onBarcode={onBarcode} onNativeCameraPendingChange={onNativeCameraPendingChange} />}
    {photo && <img className="scan-workspace__photo" src={photo} alt={t('Meal preview')} />}
    {analyzing ? <MealScanLoading onCancel={cancelScan} /> : result ? <MealScanResult result={result} items={editedItems} draft={draft} onChange={change} onItemsChange={updateItems} onAddIngredient={addIngredient} onRefine={() => { if (photo) { (document.activeElement as HTMLElement | null)?.blur(); void analyze(photo, draft.details); } }} onLog={() => void persist('log')} onSave={() => void persist('save')} onRetake={retake} onClose={close} valid={valid} canRefine={draft.details.trim() !== resultDetails} busy={busy} saved={saved} error={error} /> : photo && error && <div className="scan-error-backdrop"><section className="scan-error" role="alert"><AlertCircle size={30} /><h2>{t('Could not analyze photo')}</h2><p>{t(String(error))}</p><button type="button" className="primary-command" onClick={() => void analyze(photo, draft.details)}><RefreshCw size={18} />{t('Try again')}</button><button type="button" className="text-back" onClick={retake}><Camera size={18} />{t('Take another photo')}</button>{onDescribeMeal && <button type="button" className="text-back" onClick={onDescribeMeal}><SquarePen size={18} />{t('Describe instead')}</button>}<button type="button" className="scan-error__close" onClick={close}>{t('Cancel')}</button></section></div>}
  </div>;
}
