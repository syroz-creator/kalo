import { t } from '../i18n';
import { useEffect, useRef, useState } from 'react';
import { Minus, Plus, Trash2 } from 'lucide-react';
import type { AnalyzedFoodItem } from '../types';
import { foodPortion, resizeFoodPortion } from '../utils/mealPortions';
import { mealSwipeAction } from '../utils/mealSwipe';

function PortionRow({ removable, onRemove, children }: { removable: boolean; onRemove: () => void; children: React.ReactNode }) {
  const [offset, setOffset] = useState(0);
  const gesture = useRef<{ x: number; y: number; horizontal: boolean } | null>(null);
  return <div className={`portion-row${removable ? ' portion-row--removable' : ''}`}>
    {removable && <div className="portion-row__delete" aria-hidden="true" style={{ opacity: offset < 0 ? 1 : 0 }}><Trash2 size={20} /></div>}
    <div className="portion-food" style={removable ? { transform: `translateX(${offset}px)` } : undefined} onPointerDown={event => {
      if (!removable || (event.target as HTMLElement).closest('button, input, label') || (event.pointerType === 'mouse' && event.button !== 0)) return;
      gesture.current = { x: event.clientX, y: event.clientY, horizontal: false };
    }} onPointerMove={event => {
      const start = gesture.current;
      if (!start) return;
      const dx = event.clientX - start.x, dy = event.clientY - start.y;
      if (!start.horizontal) {
        if (Math.abs(dy) > 8 && Math.abs(dy) >= Math.abs(dx)) { gesture.current = null; return; }
        if (Math.abs(dx) < 12 || Math.abs(dx) < Math.abs(dy) * 1.25) return;
        start.horizontal = true; event.currentTarget.setPointerCapture(event.pointerId);
      }
      setOffset(Math.max(-event.currentTarget.clientWidth, Math.min(0, dx)));
    }} onPointerUp={event => {
      const start = gesture.current; gesture.current = null; setOffset(0);
      if (start?.horizontal && mealSwipeAction(event.clientX - start.x, 0, event.currentTarget.clientWidth) === 'delete') onRemove();
    }} onPointerCancel={() => { gesture.current = null; setOffset(0); }}>
      {children}
    </div>
  </div>;
}

export function MealPortionEditor({ items, onChange, removable = false, compact = false }: { items: AnalyzedFoodItem[]; onChange: (items: AnalyzedFoodItem[]) => void; removable?: boolean; compact?: boolean }) {
  const [amounts, setAmounts] = useState(() => items.map(item => foodPortion(item).amount));
  useEffect(() => { setAmounts(items.map(item => foodPortion(item).amount)); }, [items]);
  const update = (index: number, amount: number) => {
    const next = amounts.map((value, position) => position === index ? amount : value);
    setAmounts(next); onChange(items.map((item, position) => resizeFoodPortion(item, next[position])));
  };
  return <div className={`meal-portion-editor${compact ? ' meal-portion-editor--compact' : ''}`} aria-label={t("Food portions")}>{items.map((food, index) => {
    const base = foodPortion(food), amount = amounts[index] ?? base.amount;
    const step = base.unit === 'g' || base.unit === 'ml' ? 5 : base.unit === 'piece' ? 1 : 0.25;
    const resized = resizeFoodPortion(food, amount);
    if (removable && amount === 0) return null;
    return <PortionRow key={index} removable={removable} onRemove={() => update(index, 0)}><div className="portion-food__heading"><strong>{food.name}</strong><span>{resized.calories} {t("kcal")}</span>{removable && <button type="button" className="portion-food__remove" aria-label={t('Remove {name}', { name: food.name })} title={t('Remove {name}', { name: food.name })} onClick={() => update(index, 0)}><Trash2 size={15} /></button>}</div>{!compact && <small>{food.portion}</small>}
      <div className="portion-food__controls"><button type="button" className="icon-command" title={t('Decrease {name}', { name: food.name })} aria-label={t('Decrease {name}', { name: food.name })} disabled={amount <= 0} onClick={() => update(index, Math.max(0, Number((amount - step).toFixed(2))))}><Minus size={18} /></button>
        <label><span className="sr-only">{t('Amount of {name}', { name: food.name })}</span><input aria-label={t('Amount of {name}', { name: food.name })} type="number" inputMode="decimal" min="0" max="100000" step="any" value={amount} onChange={event => update(index, Math.min(100000, Math.max(0, Number(event.target.value))))} /><span>{base.unit === 'piece' ? t('pieces') : base.unit === 'serving' ? t('servings') : t(base.unit)}</span></label>
        <button type="button" className="icon-command" title={t('Increase {name}', { name: food.name })} aria-label={t('Increase {name}', { name: food.name })} onClick={() => update(index, Math.min(100000, Number((amount + step).toFixed(2))))}><Plus size={18} /></button></div>
    </PortionRow>;
  })}</div>;
}
