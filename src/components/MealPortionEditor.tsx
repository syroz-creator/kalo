import { t } from '../i18n';
import { useEffect, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import type { AnalyzedFoodItem } from '../types';
import { foodPortion, resizeFoodPortion } from '../utils/mealPortions';

export function MealPortionEditor({ items, onChange }: { items: AnalyzedFoodItem[]; onChange: (items: AnalyzedFoodItem[]) => void }) {
  const [amounts, setAmounts] = useState(() => items.map(item => foodPortion(item).amount));
  useEffect(() => { setAmounts(items.map(item => foodPortion(item).amount)); }, [items]);
  const update = (index: number, amount: number) => {
    const next = amounts.map((value, position) => position === index ? amount : value);
    setAmounts(next); onChange(items.map((item, position) => resizeFoodPortion(item, next[position])));
  };
  return <div className="meal-portion-editor" aria-label={t("Food portions")}>{items.map((food, index) => {
    const base = foodPortion(food), amount = amounts[index] ?? base.amount;
    const step = base.unit === 'g' || base.unit === 'ml' ? 5 : base.unit === 'piece' ? 1 : 0.25;
    const resized = resizeFoodPortion(food, amount);
    return <div className="portion-food" key={index}><div className="portion-food__heading"><strong>{food.name}</strong><span>{resized.calories} {t("kcal")}</span></div><small>{food.portion}</small>
      <div className="portion-food__controls"><button type="button" className="icon-command" title={t('Decrease {name}', { name: food.name })} aria-label={t('Decrease {name}', { name: food.name })} disabled={amount <= 0} onClick={() => update(index, Math.max(0, Number((amount - step).toFixed(2))))}><Minus size={18} /></button>
        <label><span className="sr-only">{t('Amount of {name}', { name: food.name })}</span><input aria-label={t('Amount of {name}', { name: food.name })} type="number" inputMode="decimal" min="0" max="100000" step="any" value={amount} onChange={event => update(index, Math.min(100000, Math.max(0, Number(event.target.value))))} /><span>{base.unit === 'piece' ? t('pieces') : base.unit === 'serving' ? t('servings') : t(base.unit)}</span></label>
        <button type="button" className="icon-command" title={t('Increase {name}', { name: food.name })} aria-label={t('Increase {name}', { name: food.name })} onClick={() => update(index, Math.min(100000, Number((amount + step).toFixed(2))))}><Plus size={18} /></button></div>
    </div>;
  })}</div>;
}
