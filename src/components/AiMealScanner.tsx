import { t } from '../i18n';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, Camera, Check, Loader2, RefreshCw, Sparkles, Upload, X } from 'lucide-react';
import type { AnalyzedFoodItem, MealAnalysisResult, MealType } from '../types';
import { analyzeMealPhoto } from '../services/mealApi';
import { captureMealPhoto, isNativeApp } from '../services/native';
import { getUserErrorMessage } from '../utils/userFacingError';
import { MealPortionEditor } from './MealPortionEditor';
import { totalFoodNutrition } from '../utils/mealPortions';

interface AiMealScannerProps {
  targetMeal: MealType;
  initialImage?: string | null;
  onChangeTargetMeal?: (meal: MealType) => void;
  onLogMealResult: (result: { meal: MealType; dishName: string; totalCalories: number; totalProtein: number; totalCarbs: number; totalFat: number; portionDescription: string; imageUrl?: string; ingredients?: AnalyzedFoodItem[] }) => Promise<boolean>;
  onClose?: () => void;
  isModal?: boolean;
  onNativeCameraPendingChange?: (pending: boolean) => void;
  onDescribeMeal?: () => void;
}
const fields = ['calories', 'protein', 'carbs', 'fat'] as const;

export function AiMealScanner({ targetMeal, initialImage, onChangeTargetMeal, onLogMealResult, onClose, onNativeCameraPendingChange, onDescribeMeal }: AiMealScannerProps) {
  const [meal, setMeal] = useState(targetMeal);
  const [photo, setPhoto] = useState<string | null>(initialImage ?? null);
  const [result, setResult] = useState<MealAnalysisResult | null>(null);
  const [editedItems, setEditedItems] = useState<AnalyzedFoodItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const errorMessage = useRef<HTMLDivElement>(null);
  const [portionDetails, setPortionDetails] = useState('');
  const [resultDetails, setResultDetails] = useState('');
  const [name, setName] = useState('');
  const [nutrition, setNutrition] = useState({ calories: '', protein: '', carbs: '', fat: '' });
  const camera = useRef<HTMLInputElement>(null);
  const library = useRef<HTMLInputElement>(null);
  const portionInput = useRef<HTMLTextAreaElement>(null);
  const request = useRef<AbortController | null>(null);
  const analyze = useCallback(async (imageUrl: string, details = '') => {
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    setPhoto(imageUrl); setPortionDetails(details); setAnalyzing(true); setError(''); setResult(null);
    try {
      const data = await analyzeMealPhoto(imageUrl, controller.signal, details);
      if (controller.signal.aborted) return;
      setResult(data); setEditedItems(data.items); setResultDetails(details.trim()); setName(data.dishName);
      setNutrition({ calories: String(data.totalCalories), protein: String(data.totalProtein), carbs: String(data.totalCarbs), fat: String(data.totalFat) });
    } catch (failure) {
      if (!controller.signal.aborted) setError(getUserErrorMessage(failure, 'We could not estimate this meal. Please try again, or log it manually.'));
    } finally { if (!controller.signal.aborted) setAnalyzing(false); }
  }, []);
  useEffect(() => { setMeal(targetMeal); }, [targetMeal]);
  useEffect(() => { if (error) errorMessage.current?.scrollIntoView({ block: 'nearest' }); }, [error]);
  useEffect(() => {
    const input = camera.current;
    const cancel = () => onNativeCameraPendingChange?.(false);
    input?.addEventListener('cancel', cancel);
    return () => input?.removeEventListener('cancel', cancel);
  }, [onNativeCameraPendingChange]);
  useEffect(() => {
    if (initialImage) void analyze(initialImage);
    return () => request.current?.abort();
  }, [initialImage, analyze]);
  const readPhoto = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    onNativeCameraPendingChange?.(false);
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => void analyze(reader.result as string);
    reader.onerror = () => setError('Could not read this photo. Please try again.');
    reader.readAsDataURL(file); event.target.value = '';
  };
  const takePhoto = async () => {
    onNativeCameraPendingChange?.(true);
    if (!isNativeApp()) { camera.current?.click(); return; }
    try {
      const image = await captureMealPhoto();
      if (image) void analyze(image);
    } catch (failure) { setError(getUserErrorMessage(failure, 'We could not open the camera. Please try again, or choose a photo from your library.')); }
    finally { onNativeCameraPendingChange?.(false); }
  };
  const cancelScan = () => {
    request.current?.abort();
    setAnalyzing(false); setError('Scan cancelled.');
  };
  const valid = portionDetails.trim() === resultDetails && editedItems.some(item => item.portionQuantity !== 0) && !!name.trim() && fields.every(field => nutrition[field].trim() !== '' && Number.isFinite(Number(nutrition[field])) && Number(nutrition[field]) >= 0);
  const log = async () => {
    if (!result || !valid || saving) return;
    const values = { calories: Number(nutrition.calories), protein: Number(nutrition.protein), carbs: Number(nutrition.carbs), fat: Number(nutrition.fat) };
    const activeItems = editedItems.filter(item => item.portionQuantity !== 0);
    const bases = totalFoodNutrition(activeItems);
    // Keep ingredient totals aligned with any corrections made before logging.
    const ingredients = activeItems.map(item => ({ ...item, ...Object.fromEntries(fields.map(field => [field, bases[field] > 0 ? item[field] * values[field] / bases[field] : values[field] / activeItems.length])) }));
    setSaving(true);
    try { if (await onLogMealResult({ meal, dishName: name.trim(), totalCalories: Math.round(values.calories), totalProtein: Math.round(values.protein * 10) / 10, totalCarbs: Math.round(values.carbs * 10) / 10, totalFat: Math.round(values.fat * 10) / 10, portionDescription: ingredients.map(item => `${item.name} (${item.portion})`).join(', '), imageUrl: photo ?? undefined, ingredients })) onClose?.(); }
    finally { setSaving(false); }
  };
  return <div className="meal-scan">
    <input ref={camera} type="file" accept="image/*" capture="environment" onChange={readPhoto} aria-label={t("Retake meal photo")} hidden />
    <input ref={library} type="file" accept="image/*" onChange={readPhoto} aria-label={t("Choose meal photo")} hidden />
    {photo && <div className="meal-scan__photo"><img src={photo} alt={t("Meal preview")} />{!analyzing && <button type="button" onClick={takePhoto}><RefreshCw size={15} />{t("Retake")}</button>}</div>}
    {analyzing && <div className="meal-scan__status" role="status"><Loader2 size={20} className="animate-spin" /><span>{t("Scanning your meal...")}</span><button type="button" className="icon-command" aria-label={t("Cancel scan")} title={t("Cancel scan")} onClick={cancelScan}><X size={20} /></button></div>}
    {error && <div ref={errorMessage} className="meal-scan__error" role="alert"><AlertCircle size={20} /><div><strong>{t("Could not analyze photo")}</strong><p>{t(String(error))}</p><div className="meal-scan__recovery">{photo && <button type="button" onClick={() => void analyze(photo, portionDetails)}>{t("Try again")}</button>}{onDescribeMeal && <button type="button" onClick={onDescribeMeal}>{t("Describe instead")}</button>}</div></div></div>}
    {!photo && <div className="meal-scan__empty"><button type="button" className="primary-command" onClick={takePhoto}><Camera size={19} />{t("Take a photo")}</button><button type="button" className="text-back" onClick={() => library.current?.click()}><Upload size={18} />{t("Photo library")}</button></div>}
    {result && <div className="meal-scan__result">
      <h2>{name || t('Your meal')}</h2><p className="detail-calories"><strong>{Math.round(Number(nutrition.calories) || 0)}</strong> {t("kcal")}</p>
      <fieldset className="meal-segments"><legend>{t("Meal type")}</legend><div>{(['breakfast', 'lunch', 'dinner', 'snacks'] as MealType[]).map(value => <button type="button" key={value} aria-pressed={meal === value} className={meal === value ? 'is-selected' : ''} onClick={() => { setMeal(value); onChangeTargetMeal?.(value); }}>{t(value.charAt(0).toUpperCase() + value.slice(1))}</button>)}</div></fieldset>
      <h3>{t("Food portions")}</h3><MealPortionEditor items={result.items} onChange={items => { setEditedItems(items); const totals = totalFoodNutrition(items); setNutrition({ calories: String(totals.calories), protein: String(totals.protein), carbs: String(totals.carbs), fat: String(totals.fat) }); }} />
      {result.notes && <p className="settings-note">{result.notes}</p>}
      {result.referenceTip && <p className="settings-note">{result.referenceTip}</p>}
      <div className="app-field"><label htmlFor="photo-portion-details">{t("Portion or label details (optional)")}</label><textarea id="photo-portion-details" ref={portionInput} rows={2} maxLength={2000} value={portionDetails} placeholder={t("e.g. 2 biscuits, 25 g total; label: 124 kcal per packet")} onChange={event => setPortionDetails(event.target.value)} /></div>
      <button type="button" className="text-back" disabled={portionDetails.trim() === resultDetails} onClick={() => { if (photo) { portionInput.current?.blur(); void analyze(photo, portionDetails); } }}><Sparkles size={18} />{t("Update estimate")}</button>
      <label className="app-field">{t("Meal name")}<input value={name} onChange={event => setName(event.target.value)} /></label>
      <div className="manual-nutrients">{fields.map(field => <label key={field} className="app-field">{t(field.charAt(0).toUpperCase() + field.slice(1))} ({field === 'calories' ? t('kcal') : t('g')})<input type="number" inputMode="decimal" min={0} step={field === 'calories' ? 1 : 0.1} value={nutrition[field]} onChange={event => setNutrition({ ...nutrition, [field]: event.target.value })} /></label>)}</div>
      <p className="settings-note">{t("Estimated nutrition")}</p><button type="button" className="primary-command" disabled={!valid || saving} onClick={() => void log()}>{saving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}{saving ? t('Saving...') : t('Log {calories} kcal to {meal}', { calories: Math.round(Number(nutrition.calories) || 0), meal: t(meal.charAt(0).toUpperCase() + meal.slice(1)) })}</button>
    </div>}
  </div>;
}
