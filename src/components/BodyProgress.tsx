import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Camera, Images, Loader2, RefreshCw, Trash2, X } from 'lucide-react';
import { t, getLocale } from '../i18n';
import type { BodyProgressPhoto } from '../types';
import { bodyComparison, nextBodyCheckIn, progressDaysApart } from '../utils/bodyProgress';
import { getTodayKey, parseDateKey } from '../utils/date';
import { useBodyProgress } from '../utils/useBodyProgress';
import { useDialogFocus } from '../utils/useDialogFocus';
import { getUserErrorMessage } from '../utils/userFacingError';
import { captureMealPhoto as capturePhoto, isNativeApp } from '../services/native';
import { prepareProgressPhoto } from '../services/progressPhoto';

export function BodyProgress({ onNativeCameraPendingChange }: { onNativeCameraPendingChange?: (pending: boolean) => void }) {
  const { photos, loading, error, refresh, save, remove } = useBodyProgress();
  const [today, setToday] = useState(getTodayKey);
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(today);
  const [image, setImage] = useState('');
  const [earlier, setEarlier] = useState('');
  const [later, setLater] = useState('');
  const [preview, setPreview] = useState<BodyProgressPhoto | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState('');
  const [message, setMessage] = useState('');
  const host = useRef<HTMLElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const camera = useRef<HTMLInputElement>(null);
  const gallery = useRef<HTMLInputElement>(null);
  const reader = useRef<FileReader | null>(null);
  const request = useRef<AbortController | null>(null);
  const busy = useRef(false);
  const pending = useRef(onNativeCameraPendingChange);
  pending.current = onNativeCameraPendingChange;
  const titleId = useId();
  const previewTitle = useId();
  const close = () => { if (busy.current) return; request.current?.abort(); reader.current?.abort(); setOpen(false); setPreparing(false); pending.current?.(false); };
  const form = useDialogFocus(open, close);
  const viewer = useDialogFocus<HTMLDivElement>(!!preview, () => setPreview(null));
  const due = nextBodyCheckIn(photos);
  const pair = bodyComparison(photos, earlier, later);
  const format = (key: string) => parseDateKey(key).toLocaleDateString(getLocale(), { month: 'short', day: 'numeric', year: 'numeric' });
  const compactDate = (key: string) => parseDateKey(key).toLocaleDateString(getLocale(), { month: 'numeric', day: 'numeric', year: 'numeric' });

  useEffect(() => {
    const timer = window.setInterval(() => setToday(getTodayKey()), 60000);
    const cancel = () => pending.current?.(false);
    const input = camera.current, library = gallery.current;
    input?.addEventListener('cancel', cancel); library?.addEventListener('cancel', cancel);
    return () => { window.clearInterval(timer); request.current?.abort(); reader.current?.abort(); pending.current?.(false); input?.removeEventListener('cancel', cancel); library?.removeEventListener('cancel', cancel); };
  }, [open]);
  useEffect(() => {
    if (!open && !preview) return;
    const shell = host.current?.closest('.kalo-shell');
    const surfaces = Array.from(shell?.querySelectorAll<HTMLElement>('.app-surface, .app-dialog-layer') ?? []);
    const previous = surfaces.map(element => element.inert);
    surfaces.forEach(element => { element.inert = true; });
    return () => {
      surfaces.forEach((element, index) => { element.inert = previous[index]; });
      returnFocus.current?.focus({ preventScroll: true });
    };
  }, [open, preview]);

  const prepare = async (source: string) => {
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    setPreparing(true); setMessage('');
    try {
      const photo = await prepareProgressPhoto(source, controller.signal);
      if (!controller.signal.aborted) setImage(photo);
    } catch (failure) {
      if (!controller.signal.aborted) setMessage(getUserErrorMessage(failure, 'This photo could not be prepared. Please try another photo.'));
    } finally { if (!controller.signal.aborted) setPreparing(false); }
  };
  const read = (event: React.ChangeEvent<HTMLInputElement>) => {
    pending.current?.(false);
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    if (file.size > 25_000_000) { setMessage('Choose a photo smaller than 25 MB.'); return; }
    request.current?.abort(); setPreparing(true); setMessage('');
    reader.current?.abort();
    const fileReader = new FileReader(); reader.current = fileReader;
    fileReader.onload = () => { void prepare(String(fileReader.result)); };
    fileReader.onerror = () => { setPreparing(false); setMessage('Could not read this photo. Please try again.'); };
    fileReader.readAsDataURL(file);
  };
  const capture = async () => {
    pending.current?.(true);
    if (!isNativeApp()) { camera.current?.click(); return; }
    try { const photo = await capturePhoto(); if (photo) await prepare(photo); }
    catch (failure) { setMessage(getUserErrorMessage(failure, 'We could not open the camera. Please try again, or choose a photo from your library.')); }
    finally { pending.current?.(false); }
  };
  const deletePhoto = async (photo: BodyProgressPhoto) => {
    if (deleting || !window.confirm(t('Delete your progress photo from {date}?', { date: format(photo.date) }))) return;
    setDeleting(photo.date); setMessage('');
    try { await remove(photo.date); }
    catch (failure) { setMessage(getUserErrorMessage(failure, 'Your progress photo could not be deleted. Please try again.')); }
    finally { setDeleting(''); }
  };
  const photoFigure = (photo: BodyProgressPhoto, side: 'earlier' | 'later' | 'single') => <figure className="body-progress__figure" key={side}>
    <button type="button" className="body-progress__image" title={t('View photo from {date}', { date: format(photo.date) })} aria-label={t('View photo from {date}', { date: format(photo.date) })} onClick={event => { returnFocus.current = event.currentTarget; setPreview(photo); }}><img src={photo.imageUrl} alt={t('Body progress photo from {date}', { date: format(photo.date) })} /></button>
    <figcaption>{side === 'single' ? <time dateTime={photo.date}>{format(photo.date)}</time> : <label><span>{side === 'earlier' ? t('Earlier') : t('Later')}</span><select aria-label={side === 'earlier' ? t('Earlier photo') : t('Later photo')} value={photo.date} onChange={event => side === 'earlier' ? setEarlier(event.target.value) : setLater(event.target.value)}>{photos.filter(item => side === 'earlier' ? item.date < pair.later!.date : item.date > pair.earlier!.date).map(item => <option key={item.date} value={item.date}>{compactDate(item.date)}</option>)}</select></label>}
      <button type="button" className="icon-command" disabled={!!deleting} title={t('Delete photo')} aria-label={t('Delete photo from {date}', { date: format(photo.date) })} onClick={() => void deletePhoto(photo)}>{deleting === photo.date ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}</button>
    </figcaption>
  </figure>;

  return <section className="body-progress" ref={host}>
    <header><div><h2>{t('Body progress')}</h2><p role="status">{!due ? t('Every 15 days') : due <= today ? t('Check-in due') : t('Next check-in: {date}', { date: format(due) })}</p></div><button type="button" className="body-progress__add" disabled={loading} onClick={event => { returnFocus.current = event.currentTarget; setDate(getTodayKey()); setImage(''); setMessage(''); setOpen(true); }}><Camera size={17} />{t('Add photo')}</button></header>
    {loading ? <p className="body-progress__empty" role="status"><Loader2 size={18} className="animate-spin" />{t('Loading photos...')}</p> : pair.earlier ? <><div className={`body-progress__photos${pair.later ? '' : ' is-single'}`}>{photoFigure(pair.earlier, pair.later ? 'earlier' : 'single')}{pair.later && photoFigure(pair.later, 'later')}</div>{pair.later && <p className="body-progress__interval">{t('{days} days apart', { days: progressDaysApart(pair.earlier.date, pair.later.date) })}</p>}</> : !error && <p className="body-progress__empty">{t('No progress photos yet.')}</p>}
    {error && <div className="body-progress__error" role="alert"><p>{t(String(error))}</p><button type="button" onClick={() => void refresh()}><RefreshCw size={16} />{t('Try again')}</button></div>}
    {message && !open && <p className="body-progress__error" role="alert">{t(String(message))}</p>}
    {open && createPortal(<div className="body-photo-overlay" onClick={event => { if (event.target === event.currentTarget) close(); }} onKeyDown={event => event.stopPropagation()}>
      <form ref={form} className="body-photo-editor" role="dialog" aria-modal="true" aria-labelledby={titleId} onSubmit={async event => {
        event.preventDefault();
        if (!image || preparing || busy.current) return;
        const replace = photos.some(photo => photo.date === date);
        if (replace && !window.confirm(t('Replace your progress photo from {date}?', { date: format(date) }))) return;
        busy.current = true; setSaving(true); setMessage('');
        try { await save({ date, imageUrl: image, createdAt: Date.now() }, replace); setOpen(false); setEarlier(''); setLater(''); }
        catch (failure) { setMessage(getUserErrorMessage(failure, 'Your progress photo was not saved. Please free some device storage and try again.')); }
        finally { busy.current = false; setSaving(false); }
      }}>
        <header><h2 id={titleId}>{t('Progress photo')}</h2><button type="button" className="icon-command" disabled={saving} aria-label={t('Close')} title={t('Close')} onClick={close}><X size={21} /></button></header>
        <label className="app-field">{t('Photo date')}<input type="date" required max={today} value={date} disabled={saving} onChange={event => setDate(event.target.value)} /></label>
        <div className="body-photo-editor__preview">{preparing ? <Loader2 size={30} className="animate-spin" aria-label={t('Preparing photo...')} /> : image ? <img src={image} alt={t('Progress photo preview')} /> : <Camera size={34} strokeWidth={1.4} />}</div>
        <input ref={camera} type="file" accept="image/*" capture="environment" hidden aria-label={t('Take progress photo')} onChange={read} />
        <input ref={gallery} type="file" accept="image/*" hidden aria-label={t('Choose progress photo')} onChange={read} />
        <div className="body-photo-editor__tools"><button type="button" disabled={preparing || saving} onClick={() => void capture()}><Camera size={19} />{t('Take photo')}</button><button type="button" disabled={preparing || saving} onClick={() => { pending.current?.(true); gallery.current?.click(); }}><Images size={19} />{t('Gallery')}</button></div>
        {message && <p className="body-progress__error" role="alert">{t(String(message))}</p>}
        <button type="submit" className="primary-command" disabled={!image || !date || date > today || preparing || saving}>{saving && <Loader2 size={18} className="animate-spin" />}{saving ? t('Saving...') : t('Save photo')}</button>
      </form>
    </div>, host.current?.closest('.kalo-shell') ?? document.body)}
    {preview && createPortal(<div className="body-photo-viewer" ref={viewer} role="dialog" aria-modal="true" aria-labelledby={previewTitle} tabIndex={-1}>
      <header><h2 id={previewTitle}>{format(preview.date)}</h2><button type="button" className="icon-command" aria-label={t('Close')} title={t('Close')} onClick={() => setPreview(null)}><X size={23} /></button></header><img src={preview.imageUrl} alt={t('Body progress photo from {date}', { date: format(preview.date) })} />
    </div>, host.current?.closest('.kalo-shell') ?? document.body)}
  </section>;
}
