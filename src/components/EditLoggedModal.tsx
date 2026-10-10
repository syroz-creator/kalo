import { useEffect, useState } from 'react';
import { ChevronLeft, Trash2, Check, Minus, Plus } from 'lucide-react';
import type { LoggedItem, MealType, AnalyzedFoodItem } from '../types';
import { useDialogFocus } from '../utils/useDialogFocus';

interface Props { isOpen: boolean; onClose: () => void; item: LoggedItem | null; onUpdate: (id: string, updates: Partial<LoggedItem>) => void; onDelete: (id: string) => void }
const keys = ['calories', 'protein', 'carbs', 'fat'] as const;
function portion(food: AnalyzedFoodItem) {
  const match = food.portion.match(/^(\d+(?:\.\d+)?)\s*(?:g|grams?)$/i);
  return match && Number(match[1]) > 0 ? { amount: Number(match[1]), unit: 'g', step: 10 } : { amount: 1, unit: 'portion', step: 0.25 };
}

export function EditLoggedModal({ isOpen, item, onClose, onUpdate, onDelete }: Props) {
  const [meal, setMeal] = useState<MealType>('lunch');
  const [name, setName] = useState('');
  const [nutrition, setNutrition] = useState({ calories: '0', protein: '0', carbs: '0', fat: '0' });
  const [amounts, setAmounts] = useState<number[]>([]);
  const dialogRef = useDialogFocus(isOpen, onClose);
  useEffect(() => {
    if (!item) return;
    setMeal(item.meal); setName(item.name);
    setNutrition({ calories: String(item.calories), protein: String(item.protein), carbs: String(item.carbs), fat: String(item.fat) });
    setAmounts(item.ingredients?.map(food => portion(food).amount) ?? []);
  }, [item]);
  if (!isOpen || !item) return null;
  const ingredients = item.ingredients?.map((food, index) => {
    const base = portion(food);
    const amount = amounts[index] ?? base.amount;
    const ratio = amount / base.amount;
    return { ...food, portion: `${amount} ${base.unit}`, calories: Math.round(food.calories * ratio), protein: Math.round(food.protein * ratio * 10) / 10, carbs: Math.round(food.carbs * ratio * 10) / 10, fat: Math.round(food.fat * ratio * 10) / 10 };
  });
  const hasIngredients = !!ingredients?.length;
  const totals = Object.fromEntries(keys.map(key => [key, hasIngredients ? ingredients!.reduce((sum, food) => sum + food[key], 0) : Number(nutrition[key])])) as Record<typeof keys[number], number>;
  const valid = !!name.trim() && keys.every(key => Number.isFinite(totals[key]) && totals[key] >= 0 && (hasIngredients || nutrition[key] !== ''));
  return <form ref={dialogRef} className="detail-page" role="dialog" aria-modal="true" aria-labelledby="meal-title" onSubmit={event => {
    event.preventDefault(); if (!valid) return;
    onUpdate(item.id, { name: name.trim(), meal, ...totals, calories: Math.round(totals.calories), ingredients: hasIngredients ? ingredients : item.ingredients }); onClose();
  }}>
    <div className="detail-scroll">
      {item.imageUrl ? <div className="detail-photo"><img src={item.imageUrl} alt={item.name} /><button type="button" aria-label="Back to Today" title="Back" onClick={onClose}><ChevronLeft size={25} /></button></div> : <button type="button" className="text-back" onClick={onClose}><ChevronLeft size={19} />Today</button>}
      <div className="detail-body">
        <h1 id="meal-title">{name || 'Meal details'}</h1>
        <p className="detail-calories"><strong>{Math.round(totals.calories).toLocaleString('en-US')}</strong> kcal</p>
        <fieldset className="meal-segments"><legend>Meal type</legend><div>{(['breakfast', 'lunch', 'dinner', 'snacks'] as MealType[]).map(value => <button type="button" key={value} aria-pressed={meal === value} className={meal === value ? 'is-selected' : ''} onClick={() => setMeal(value)}>{value.charAt(0).toUpperCase() + value.slice(1)}</button>)}</div></fieldset>
        <div className="detail-macros">{(['protein', 'carbs', 'fat'] as const).map(key => <div key={key} className={`detail-macro detail-macro--${key}`}><span />{key.charAt(0).toUpperCase() + key.slice(1)}<strong>{Number(totals[key].toFixed(1))}<small>g</small></strong></div>)}</div>
        {hasIngredients && <div className="ingredients-list">{ingredients!.map((food, index) => {
          const base = portion(item.ingredients![index]);
          const amount = amounts[index] ?? base.amount;
          return <div className="ingredient-row" key={index}><div><strong>{food.name}</strong><small>{food.calories} kcal</small></div><div className="ingredient-stepper"><button type="button" title="Decrease portion" aria-label={`Decrease ${food.name}`} disabled={amount <= base.step} onClick={() => setAmounts(values => values.map((value, i) => i === index ? Math.max(base.step, value - base.step) : value))}><Minus size={18} /></button><span>{amount}<small>{base.unit}</small></span><button type="button" title="Increase portion" aria-label={`Increase ${food.name}`} onClick={() => setAmounts(values => values.map((value, i) => i === index ? value + base.step : value))}><Plus size={18} /></button></div></div>;
        })}</div>}
        <label className="app-field">Meal name<input required value={name} onChange={event => setName(event.target.value)} /></label>
        {!hasIngredients && <div className="manual-nutrients">{keys.map(key => <label className="app-field" key={key}>{key.charAt(0).toUpperCase() + key.slice(1)} ({key === 'calories' ? 'kcal' : 'g'})<input type="number" min={0} required step={key === 'calories' ? 1 : 0.1} value={nutrition[key]} onChange={event => setNutrition({ ...nutrition, [key]: event.target.value })} /></label>)}</div>}
        {item.source === 'ai_camera' && <p className="settings-note">Estimated nutrition</p>}
      </div>
    </div>
    <footer className="detail-footer"><button type="submit" disabled={!valid} className="primary-command"><Check size={18} />Save changes</button><button type="button" className="delete-command" onClick={() => { onDelete(item.id); onClose(); }}><Trash2 size={17} />Delete meal</button></footer>
  </form>;
}
