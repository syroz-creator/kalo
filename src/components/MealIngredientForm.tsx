import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { t } from '../i18n';
import type { AnalyzedFoodItem } from '../types';

export function MealIngredientForm({ onAdd, onCancel }: { onAdd: (food: AnalyzedFoodItem) => void; onCancel: () => void }) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('100');
  const [unit, setUnit] = useState<NonNullable<AnalyzedFoodItem['portionUnit']>>('g');
  const [nutrition, setNutrition] = useState({ calories: '', protein: '', carbs: '', fat: '' });
  const valid = name.trim() && Number(amount) > 0 && Number(amount) <= 100000 && nutrition.calories.trim() !== '' && Object.values(nutrition).every(value => Number.isFinite(Number(value)) && Number(value) >= 0);
  return <form className="scan-ingredient-form" aria-label={t('Add ingredient')} onSubmit={event => {
    event.preventDefault();
    if (!valid) return;
    onAdd({ name: name.trim(), portion: `${Number(amount)} ${unit}`, portionQuantity: Number(amount), portionUnit: unit, calories: Number(nutrition.calories), protein: Number(nutrition.protein), carbs: Number(nutrition.carbs), fat: Number(nutrition.fat) });
  }}>
    <label className="app-field">{t('Ingredient name')}<input autoFocus required value={name} onChange={event => setName(event.target.value)} /></label>
    <div className="scan-ingredient-form__portion"><label className="app-field">{t('Amount')}<input type="number" min="0.01" max="100000" step="any" inputMode="decimal" required value={amount} onChange={event => setAmount(event.target.value)} /></label><label className="app-field">{t('Unit')}<select value={unit} onChange={event => setUnit(event.target.value as typeof unit)}>{(['g', 'ml', 'piece', 'serving'] as const).map(value => <option key={value} value={value}>{value === 'piece' ? t('pieces') : value === 'serving' ? t('servings') : t(value)}</option>)}</select></label></div>
    <div className="manual-nutrients">{(['calories', 'protein', 'carbs', 'fat'] as const).map(field => <label className="app-field" key={field}>{t(field.charAt(0).toUpperCase() + field.slice(1))} ({field === 'calories' ? t('kcal') : t('g')})<input type="number" inputMode="decimal" min="0" step="any" required={field === 'calories'} value={nutrition[field]} placeholder="0" onChange={event => setNutrition(values => ({ ...values, [field]: event.target.value }))} /></label>)}</div>
    <div className="scan-ingredient-form__actions"><button type="button" className="text-back" onClick={onCancel}><X size={17} />{t('Cancel')}</button><button type="submit" className="primary-command" disabled={!valid}><Check size={18} />{t('Add ingredient')}</button></div>
  </form>;
}
