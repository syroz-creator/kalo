import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, Camera, Check, Loader2, RefreshCw, Upload } from 'lucide-react';
import type { AnalyzedFoodItem, MealAnalysisResult, MealType } from '../types';
import { analyzeMealPhoto } from '../services/mealApi';

interface AiMealScannerProps {
  targetMeal: MealType;
  initialImage?: string | null;
  onChangeTargetMeal?: (meal: MealType) => void;
  onLogMealResult: (result: { meal: MealType; dishName: string; totalCalories: number; totalProtein: number; totalCarbs: number; totalFat: number; portionDescription: string; imageUrl?: string; ingredients?: AnalyzedFoodItem[] }) => void;
  onClose?: () => void;
  isModal?: boolean;
  onNativeCameraPendingChange?: (pending: boolean) => void;
}
const fields = ['calories', 'protein', 'carbs', 'fat'] as const;

export function AiMealScanner({ targetMeal, initialImage, onChangeTargetMeal, onLogMealResult, onClose, onNativeCameraPendingChange }: AiMealScannerProps) {
  const [meal, setMeal] = useState(targetMeal);
  const [photo, setPhoto] = useState<string | null>(initialImage ?? null);
  const [result, setResult] = useState<MealAnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [nutrition, setNutrition] = useState({ calories: '', protein: '', carbs: '', fat: '' });
  const camera = useRef<HTMLInputElement>(null);
  const library = useRef<HTMLInputElement>(null);
  const request = useRef<AbortController | null>(null);
  const analyze = useCallback(async (imageUrl: string) => {
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    setPhoto(imageUrl); setAnalyzing(true); setError(''); setResult(null);
    try {
      const data = await analyzeMealPhoto(imageUrl, controller.signal);
      if (controller.signal.aborted) return;
      setResult(data); setName(data.dishName);
      setNutrition({ calories: String(data.totalCalories), protein: String(data.totalProtein), carbs: String(data.totalCarbs), fat: String(data.totalFat) });
    } catch (failure) {
      if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : 'Could not analyze this meal. Please try again.');
    } finally { if (!controller.signal.aborted) setAnalyzing(false); }
  }, []);
  useEffect(() => { setMeal(targetMeal); }, [targetMeal]);
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
  const takePhoto = () => { onNativeCameraPendingChange?.(true); camera.current?.click(); };
  const valid = !!name.trim() && fields.every(field => nutrition[field].trim() !== '' && Number.isFinite(Number(nutrition[field])) && Number(nutrition[field]) >= 0);
  const log = () => {
    if (!result || !valid) return;
    const values = { calories: Number(nutrition.calories), protein: Number(nutrition.protein), carbs: Number(nutrition.carbs), fat: Number(nutrition.fat) };
    const bases = { calories: result.totalCalories, protein: result.totalProtein, carbs: result.totalCarbs, fat: result.totalFat };
    // Keep ingredient totals aligned with any corrections made before logging.
    const ingredients = result.items.map(item => ({ ...item, ...Object.fromEntries(fields.map(field => [field, bases[field] > 0 ? item[field] * values[field] / bases[field] : values[field] / result.items.length])) }));
    onLogMealResult({ meal, dishName: name.trim(), totalCalories: Math.round(values.calories), totalProtein: Math.round(values.protein * 10) / 10, totalCarbs: Math.round(values.carbs * 10) / 10, totalFat: Math.round(values.fat * 10) / 10, portionDescription: ingredients.map(item => `${item.name} (${item.portion})`).join(', '), imageUrl: photo ?? undefined, ingredients });
    onClose?.();
  };
  return <div className="meal-scan">
    <input ref={camera} type="file" accept="image/*" capture="environment" onChange={readPhoto} aria-label="Retake meal photo" hidden />
    <input ref={library} type="file" accept="image/*" onChange={readPhoto} aria-label="Choose meal photo" hidden />
    {photo && <div className="meal-scan__photo"><img src={photo} alt="Meal preview" />{!analyzing && <button type="button" onClick={takePhoto}><RefreshCw size={15} />Retake</button>}</div>}
    {analyzing && <div className="meal-scan__status" role="status"><Loader2 size={20} className="animate-spin" /><span>Scanning your meal...</span></div>}
    {error && <div className="meal-scan__error" role="alert"><AlertCircle size={20} /><div><strong>Could not analyze photo</strong><p>{error}</p>{photo && <button type="button" onClick={() => void analyze(photo)}>Try again</button>}</div></div>}
    {!photo && <div className="meal-scan__empty"><button type="button" className="primary-command" onClick={takePhoto}><Camera size={19} />Take a photo</button><button type="button" className="text-back" onClick={() => library.current?.click()}><Upload size={18} />Photo library</button></div>}
    {result && <div className="meal-scan__result">
      <h2>{name || 'Your meal'}</h2><p className="detail-calories"><strong>{Math.round(Number(nutrition.calories) || 0)}</strong> kcal</p>
      <fieldset className="meal-segments"><legend>Meal type</legend><div>{(['breakfast', 'lunch', 'dinner', 'snacks'] as MealType[]).map(value => <button type="button" key={value} aria-pressed={meal === value} className={meal === value ? 'is-selected' : ''} onClick={() => { setMeal(value); onChangeTargetMeal?.(value); }}>{value.charAt(0).toUpperCase() + value.slice(1)}</button>)}</div></fieldset>
      <h3>Ingredients</h3><ul className="recipe-ingredients">{result.items.map((food, index) => <li key={index}><span><strong>{food.name}</strong><small>{food.portion}</small></span><span>{Math.round(food.calories)} kcal</span></li>)}</ul>
      <label className="app-field">Meal name<input value={name} onChange={event => setName(event.target.value)} /></label>
      <div className="manual-nutrients">{fields.map(field => <label key={field} className="app-field">{field.charAt(0).toUpperCase() + field.slice(1)} ({field === 'calories' ? 'kcal' : 'g'})<input type="number" inputMode="decimal" min={0} step={field === 'calories' ? 1 : 0.1} value={nutrition[field]} onChange={event => setNutrition({ ...nutrition, [field]: event.target.value })} /></label>)}</div>
      <p className="settings-note">Estimated nutrition</p><button type="button" className="primary-command" disabled={!valid} onClick={log}><Check size={18} />Log {Math.round(Number(nutrition.calories) || 0)} kcal to {meal.charAt(0).toUpperCase() + meal.slice(1)}</button>
    </div>}
  </div>;
}
