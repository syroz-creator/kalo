import { t } from '../i18n';
import { Minus, Plus } from 'lucide-react';
import type { ProductPortion } from '../types';
import { productPortionNutrition } from '../services/barcodeFood';

export function ProductPortionControls({ portion, onChange }: { portion: ProductPortion; onChange: (portion: ProductPortion) => void }) {
  const { product, amount, mode } = portion;
  const weight = productPortionNutrition(portion).weight;
  const pieceWeight = portion.pieceWeight ?? product.pieceQuantity;
  const step = mode === 'weight' ? 5 : 1;
  const switchMode = (next: ProductPortion['mode']) => {
    const divisor = next === 'weight' ? 1 : next === 'servings' ? product.servingQuantity : pieceWeight;
    if (divisor) onChange({ ...portion, mode: next, amount: weight ? Number((weight / divisor).toFixed(3)) : 1 });
  };
  return <section className="portion-controls" aria-label={t("Portion size")}>
    <fieldset className="meal-segments portion-modes"><legend>{t("Amount eaten")}</legend><div>
      <button type="button" aria-pressed={mode === 'weight'} className={mode === 'weight' ? 'is-selected' : ''} onClick={() => switchMode('weight')}>{product.unit === 'ml' ? t('Millilitres') : t('Grams')}</button>
      {product.servingQuantity && <button type="button" aria-pressed={mode === 'servings'} className={mode === 'servings' ? 'is-selected' : ''} onClick={() => switchMode('servings')}>{t("Servings")}</button>}
      {pieceWeight && <button type="button" aria-pressed={mode === 'pieces'} className={mode === 'pieces' ? 'is-selected' : ''} onClick={() => switchMode('pieces')}>{t("Pieces")}</button>}
    </div></fieldset>
    <div className="portion-amount">
      <button type="button" className="icon-command" title={t("Decrease amount")} aria-label={t("Decrease amount")} disabled={amount <= step} onClick={() => onChange({ ...portion, amount: Math.max(step, Number((amount - step).toFixed(3))) })}><Minus size={20} /></button>
      <label className="app-field">{mode === 'weight' ? t('Weight ({unit})', { unit: t(product.unit) }) : mode === 'pieces' ? t('Number of pieces') : t('Number of servings')}<input type="number" inputMode="decimal" min="0.001" max="100000" step="any" value={amount || ''} onChange={event => onChange({ ...portion, amount: Number(event.target.value) })} /></label>
      <button type="button" className="icon-command" title={t("Increase amount")} aria-label={t("Increase amount")} onClick={() => onChange({ ...portion, amount: Number((amount + step).toFixed(3)) })}><Plus size={20} /></button>
    </div>
    {weight > 0 && <p className="portion-weight">{Number(weight.toFixed(2))} {t(product.unit)} {t("total")}</p>}
    {product.servingQuantity && <p className="settings-note">{t("1 serving =")} {product.servingQuantity} {t(product.unit)}{product.servingLabel ? ` (${product.servingLabel})` : ''}</p>}
    {pieceWeight && <p className="settings-note">1 {product.pieceLabel || t('piece')} = {Number(pieceWeight.toFixed(2))} {t(product.unit)}</p>}
    {!product.pieceQuantity && product.unit === 'g' && <label className="app-field">{t("Weight per piece (g, optional)")}<input type="number" inputMode="decimal" min="0.001" max="100000" step="any" value={portion.pieceWeight || ''} onChange={event => {
      const next = Number(event.target.value);
      onChange({ ...portion, pieceWeight: next > 0 && Number.isFinite(next) ? next : undefined, ...(mode === 'pieces' && !(next > 0) ? { mode: 'weight', amount: weight } : {}) });
    }} /></label>}
  </section>;
}
