import { t } from '../i18n';
import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Camera, Check, ChevronLeft, Loader2, ScanBarcode, SquarePen, Upload, X } from 'lucide-react';
import type { LoggedItem, MealType, ProductPortion } from '../types';
import { lookupBarcode, productPortionNutrition } from '../services/barcodeFood';
import { readBarcodePhoto, startBarcodeCamera } from '../services/barcodeReader';
import { getUserErrorMessage } from '../utils/userFacingError';
import { useDialogFocus } from '../utils/useDialogFocus';
import { ProductPortionControls } from './ProductPortionControls';

export function BarcodeMealModal({ date, meal: initialMeal, onClose, onLog, onManual }: { date: string; meal: MealType; onClose: () => void; onLog: (item: Omit<LoggedItem, 'id' | 'createdAt'>) => Promise<boolean>; onManual: () => void }) {
  const [saving, setSaving] = useState(false);
  const [barcode, setBarcode] = useState('');
  const [meal, setMeal] = useState(initialMeal);
  const [portion, setPortion] = useState<ProductPortion | null>(null);
  const [busy, setBusy] = useState(false);
  const [camera, setCamera] = useState(false);
  const [error, setError] = useState('');
  const video = useRef<HTMLVideoElement>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const barcodeInput = useRef<HTMLInputElement>(null);
  const errorMessage = useRef<HTMLDivElement>(null);
  const request = useRef<AbortController | null>(null);
  const cameraRequest = useRef<AbortController | null>(null);
  const cameraTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const dialog = useDialogFocus(true, onClose);
  const stopCamera = () => { cameraRequest.current?.abort(); clearTimeout(cameraTimer.current); setCamera(false); };
  useEffect(() => () => { request.current?.abort(); cameraRequest.current?.abort(); clearTimeout(cameraTimer.current); }, []);
  useEffect(() => { if (error) errorMessage.current?.scrollIntoView({ block: 'nearest' }); }, [error]);
  useEffect(() => {
    const hidden = () => { if (document.visibilityState === 'hidden') stopCamera(); };
    document.addEventListener('visibilitychange', hidden);
    return () => document.removeEventListener('visibilitychange', hidden);
  }, []);
  const findProduct = async (value: string) => {
    stopCamera(); request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    barcodeInput.current?.blur();
    setBusy(true); setError(''); setPortion(null); setBarcode(value);
    try {
      const product = await lookupBarcode(value, controller.signal);
      if (controller.signal.aborted) return;
      setPortion({ product, mode: product.servingQuantity ? 'servings' : 'weight', amount: product.servingQuantity ? 1 : 0 });
    } catch (failure) { if (!controller.signal.aborted) setError(getUserErrorMessage(failure, 'We could not find this product. Please try again.')); }
    finally { if (!controller.signal.aborted) setBusy(false); }
  };
  const scan = async () => {
    stopCamera(); request.current?.abort(); setBusy(false); setError(''); setPortion(null);
    const controller = new AbortController(); cameraRequest.current = controller; setCamera(true);
    cameraTimer.current = setTimeout(() => { controller.abort(); setCamera(false); setError('No barcode was found yet. Try a closer view, a photo, or enter the digits.'); }, 30000);
    try { await startBarcodeCamera(video.current!, value => { void findProduct(value); }, controller.signal); }
    catch (failure) { if (!controller.signal.aborted) { stopCamera(); setError(getUserErrorMessage(failure, 'We could not open the camera. Enter the barcode digits instead.')); } }
  };
  const readPhoto = async (file: File) => {
    stopCamera(); request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    setBusy(true); setError(''); setPortion(null);
    try { const value = await readBarcodePhoto(file, controller.signal); if (!controller.signal.aborted) await findProduct(value); }
    catch (failure) { if (!controller.signal.aborted) { setError(getUserErrorMessage(failure, 'We could not read the barcode. Enter its digits instead.')); setBusy(false); } }
  };
  const nutrition = portion ? productPortionNutrition(portion) : null;
  const valid = !!portion && !!nutrition && Number.isFinite(nutrition.weight) && nutrition.weight > 0 && nutrition.weight <= 100000 && !busy && !camera;
  return <form ref={dialog} className="detail-page manual-page barcode-page" role="dialog" aria-modal="true" aria-labelledby="barcode-title" onSubmit={async event => {
    event.preventDefault();
    if (!valid || !portion || !nutrition || saving) return;
    const { product } = portion;
    setSaving(true);
    try { if (await onLog({ date, meal, name: product.name, brand: product.brand, foodId: `off-${product.barcode}`, source: 'openfoodfacts', quantity: portion.amount, unit: portion.mode === 'weight' ? product.unit : portion.mode === 'pieces' ? product.pieceLabel || 'piece' : 'serving', calories: nutrition.calories, protein: nutrition.protein, carbs: nutrition.carbs, fat: nutrition.fat, productPortion: portion })) onClose(); }
    finally { setSaving(false); }
  }}>
    <div className="detail-scroll">
      <button type="button" className="text-back" onClick={onClose}><ChevronLeft size={19} />{t("Today")}</button><h1 id="barcode-title">{t("Scan a barcode")}</h1>
      <div className="barcode-preview" hidden={!camera}><video ref={video} muted playsInline aria-label={t("Barcode camera")} /><span className="barcode-viewfinder" aria-hidden="true" /><button type="button" className="icon-command" aria-label={t("Stop barcode camera")} title={t("Stop camera")} onClick={stopCamera}><X size={22} /></button></div>
      <div className="barcode-tools"><button type="button" className="primary-command" disabled={busy || camera} onClick={() => void scan()}><Camera size={19} />{t("Scan barcode")}</button><button type="button" className="icon-command" title={t("Choose barcode photo")} aria-label={t("Choose barcode photo")} disabled={busy} onClick={() => photoInput.current?.click()}><Upload size={22} /></button></div>
      <input ref={photoInput} type="file" accept="image/*" aria-label={t("Barcode photo")} hidden onChange={event => { const file = event.target.files?.[0]; if (file) void readPhoto(file); event.target.value = ''; }} />
      <div className="barcode-entry"><div className="app-field"><label htmlFor="barcode-digits">{t("Barcode digits")}</label><input ref={barcodeInput} id="barcode-digits" inputMode="numeric" autoComplete="off" value={barcode} maxLength={24} disabled={busy} onChange={event => { stopCamera(); setBarcode(event.target.value); setPortion(null); setError(''); }} /></div><button type="button" className="icon-command" title={t("Find product")} aria-label={t("Find product")} disabled={busy || !barcode.trim()} onClick={() => void findProduct(barcode)}><ScanBarcode size={22} /></button></div>
      {busy && <div className="meal-scan__status" role="status"><Loader2 size={20} className="animate-spin" /><span>{t("Finding your product...")}</span><button type="button" className="icon-command" title={t("Cancel lookup")} aria-label={t("Cancel lookup")} onClick={() => { request.current?.abort(); setBusy(false); }}><X size={20} /></button></div>}
      {error && <div ref={errorMessage} className="meal-scan__error" role="alert"><AlertCircle size={20} /><p>{t(String(error))}</p></div>}
      {portion && nutrition && <section className="barcode-product" aria-label={t("Scanned product")}>
        <div className="barcode-product__heading">{portion.product.imageUrl && <img src={portion.product.imageUrl} alt={portion.product.name} />}<div><h2>{portion.product.name}</h2>{portion.product.brand && <p>{portion.product.brand}</p>}</div></div>
        <p className="detail-calories"><strong>{nutrition.calories}</strong> {t("kcal")}</p>
        <ProductPortionControls portion={portion} onChange={setPortion} />
        <div className="detail-macros">{(['protein', 'carbs', 'fat'] as const).map(field => <div className={`detail-macro detail-macro--${field}`} key={field}><span />{t(field.charAt(0).toUpperCase() + field.slice(1))}<strong>{nutrition[field]}<small>{t("g")}</small></strong></div>)}</div>
        <a className="settings-note barcode-source" href={`https://world.openfoodfacts.org/product/${portion.product.barcode}`} target="_blank" rel="noreferrer">{t("Open Food Facts")}</a>
      </section>}
      <label className="app-field">{t("Meal")}<select value={meal} onChange={event => setMeal(event.target.value as MealType)}>{(['breakfast', 'lunch', 'dinner', 'snacks'] as MealType[]).map(value => <option key={value} value={value}>{t(value.charAt(0).toUpperCase() + value.slice(1))}</option>)}</select></label>
      <button type="button" className="text-back" onClick={onManual}><SquarePen size={18} />{t("Log manually")}</button>
    </div>
    <footer className="detail-footer"><button type="submit" className="primary-command" disabled={!valid || saving}>{saving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}{saving ? t('Saving...') : t('Log {calories} kcal', { calories: nutrition?.calories || 0 })}</button></footer>
  </form>;
}
