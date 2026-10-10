import { useState } from 'react';
import { ChevronLeft, Check } from 'lucide-react';
import type { LoggedItem, MealType } from '../types';
import { useDialogFocus } from '../utils/useDialogFocus';

export function ManualMealModal({ meal: initialMeal, date, onClose, onLog }: { meal: MealType; date: string; onClose: () => void; onLog: (item: Omit<LoggedItem, 'id' | 'createdAt'>) => void }) {
  const [meal, setMeal] = useState(initialMeal);
  const dialogRef = useDialogFocus(true, onClose);
  const [name, setName] = useState('');
  const [nutrition, setNutrition] = useState({ calories: '', protein: '', carbs: '', fat: '' });
  const valid = name.trim() && nutrition.calories !== '' && Object.values(nutrition).every(value => Number.isFinite(Number(value)) && Number(value) >= 0);
  return (
    <form ref={dialogRef} className="detail-page manual-page" role="dialog" aria-modal="true" aria-labelledby="manual-title" onSubmit={event => {
      event.preventDefault();
      if (!valid) return;
      onLog({ date, meal, name: name.trim(), foodId: `manual-${Date.now()}`, quantity: 1, unit: 'serving', source: 'custom', calories: Math.round(Number(nutrition.calories)), protein: Number(nutrition.protein), carbs: Number(nutrition.carbs), fat: Number(nutrition.fat) });
      onClose();
    }}>
      <div className="detail-scroll">
        <button type="button" className="text-back" onClick={onClose}><ChevronLeft size={19} />Today</button>
        <h1 id="manual-title">Log a meal</h1>
        <label className="app-field">Meal name<input autoFocus required value={name} onChange={event => setName(event.target.value)} placeholder="e.g. Eggs on toast" /></label>
        <label className="app-field">Meal<select value={meal} onChange={event => setMeal(event.target.value as MealType)}>{['breakfast', 'lunch', 'dinner', 'snacks'].map(value => <option key={value} value={value}>{value.charAt(0).toUpperCase() + value.slice(1)}</option>)}</select></label>
        <div className="manual-nutrients">{(['calories', 'protein', 'carbs', 'fat'] as const).map(key => <label key={key} className="app-field">{key.charAt(0).toUpperCase() + key.slice(1)} ({key === 'calories' ? 'kcal' : 'g'})<input type="number" inputMode="decimal" min={0} step={key === 'calories' ? 1 : 0.1} required={key === 'calories'} value={nutrition[key]} onChange={event => setNutrition({ ...nutrition, [key]: event.target.value })} placeholder="0" /></label>)}</div>
      </div>
      <footer className="detail-footer"><button type="submit" disabled={!valid} className="primary-command"><Check size={18} />Log meal</button></footer>
    </form>
  );
}
