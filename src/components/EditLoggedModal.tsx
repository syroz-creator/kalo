import { t, getLocale } from '../i18n';
import { useEffect, useState } from 'react';
import { ChevronLeft, Trash2, Check } from 'lucide-react';
import type { LoggedItem, MealType, AnalyzedFoodItem, ProductPortion } from '../types';
import { useDialogFocus } from '../utils/useDialogFocus';
import { MealPortionEditor } from './MealPortionEditor';
import { ProductPortionControls } from './ProductPortionControls';
import { productPortionNutrition } from '../services/barcodeFood';

interface Props { isOpen: boolean; onClose: () => void; item: LoggedItem | null; onUpdate: (id: string, updates: Partial<LoggedItem>) => boolean; onDelete: (id: string) => boolean }
const keys = ['calories', 'protein', 'carbs', 'fat'] as const;
export function EditLoggedModal({ isOpen, item, onClose, onUpdate, onDelete }: Props) {
  const [meal, setMeal] = useState<MealType>('lunch');
  const [name, setName] = useState('');
  const [nutrition, setNutrition] = useState({ calories: '0', protein: '0', carbs: '0', fat: '0' });
  const [ingredients, setIngredients] = useState<AnalyzedFoodItem[]>([]);
  const [productPortion, setProductPortion] = useState<ProductPortion | undefined>();
  const dialogRef = useDialogFocus(isOpen, onClose);
  useEffect(() => {
    if (!item) return;
    setMeal(item.meal); setName(item.name);
    setNutrition({ calories: String(item.calories), protein: String(item.protein), carbs: String(item.carbs), fat: String(item.fat) });
    setIngredients(item.ingredients ?? []); setProductPortion(item.productPortion);
  }, [item]);
  if (!isOpen || !item) return null;
  const hasIngredients = !!ingredients?.length;
  const productNutrition = productPortion && productPortionNutrition(productPortion);
  const totals = productNutrition ?? Object.fromEntries(keys.map(key => [key, hasIngredients ? ingredients.reduce((sum, food) => sum + food[key], 0) : Number(nutrition[key])])) as Record<typeof keys[number], number>;
  const valid = !!name.trim() && (!hasIngredients || ingredients.some(food => food.portionQuantity !== 0)) && (!productNutrition || (productNutrition.weight > 0 && productNutrition.weight <= 100000)) && keys.every(key => Number.isFinite(totals[key]) && totals[key] >= 0 && (hasIngredients || !!productPortion || nutrition[key] !== ''));
  return <form ref={dialogRef} className="detail-page" role="dialog" aria-modal="true" aria-labelledby="meal-title" onSubmit={event => {
    event.preventDefault(); if (!valid) return;
    if (onUpdate(item.id, { name: name.trim(), meal, calories: Math.round(totals.calories), protein: totals.protein, carbs: totals.carbs, fat: totals.fat, ingredients: hasIngredients ? ingredients.filter(food => food.portionQuantity !== 0) : item.ingredients, ...(productPortion ? { productPortion, quantity: productPortion.amount, unit: productPortion.mode === 'weight' ? productPortion.product.unit : productPortion.mode === 'pieces' ? productPortion.product.pieceLabel || 'piece' : 'serving' } : {}) })) onClose();
  }}>
    <div className="detail-scroll">
      {item.imageUrl ? <div className="detail-photo"><img src={item.imageUrl} alt={item.name} /><button type="button" aria-label={t("Back to Today")} title={t("Back")} onClick={onClose}><ChevronLeft size={25} /></button></div> : <button type="button" className="text-back" onClick={onClose}><ChevronLeft size={19} />{t("Today")}</button>}
      <div className="detail-body">
        <h1 id="meal-title">{name || t('Meal details')}</h1>
        <p className="detail-calories"><strong>{Math.round(totals.calories).toLocaleString(getLocale())}</strong> {t("kcal")}</p>
        <fieldset className="meal-segments"><legend>{t("Meal type")}</legend><div>{(['breakfast', 'lunch', 'dinner', 'snacks'] as MealType[]).map(value => <button type="button" key={value} aria-pressed={meal === value} className={meal === value ? 'is-selected' : ''} onClick={() => setMeal(value)}>{t(value.charAt(0).toUpperCase() + value.slice(1))}</button>)}</div></fieldset>
        <div className="detail-macros">{(['protein', 'carbs', 'fat'] as const).map(key => <div key={key} className={`detail-macro detail-macro--${key}`}><span />{t(key.charAt(0).toUpperCase() + key.slice(1))}<strong>{Number(totals[key].toFixed(1))}<small>{t("g")}</small></strong></div>)}</div>
        {hasIngredients && item.ingredients && <MealPortionEditor items={item.ingredients} onChange={setIngredients} />}
        {productPortion && <ProductPortionControls portion={productPortion} onChange={setProductPortion} />}
        <label className="app-field">{t("Meal name")}<input required value={name} onChange={event => setName(event.target.value)} /></label>
        {!hasIngredients && !productPortion && <div className="manual-nutrients">{keys.map(key => <label className="app-field" key={key}>{t(key.charAt(0).toUpperCase() + key.slice(1))} ({key === 'calories' ? t('kcal') : t('g')})<input type="number" min={0} required step={key === 'calories' ? 1 : 0.1} value={nutrition[key]} onChange={event => setNutrition({ ...nutrition, [key]: event.target.value })} /></label>)}</div>}
        {(item.source === 'ai_camera' || item.source === 'ai_text') && <p className="settings-note">{t("Estimated nutrition")}</p>}
      </div>
    </div>
    <footer className="detail-footer"><button type="submit" disabled={!valid} className="primary-command"><Check size={18} />{t("Save changes")}</button><button type="button" className="delete-command" onClick={() => { if (onDelete(item.id)) onClose(); }}><Trash2 size={17} />{t("Delete meal")}</button></footer>
  </form>;
}
