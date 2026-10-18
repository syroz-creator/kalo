import { useEffect, useRef, useState } from 'react';
import { Camera, Images, Loader2, RefreshCw, ScanBarcode, Zap, ZapOff } from 'lucide-react';
import { t } from '../i18n';
import { cameraError, captureMealPhoto, isNativeApp } from '../services/native';
import { openCameraStream } from '../services/cameraSession';

export function MealCamera({ onPhoto, onClose, onBarcode, onNativeCameraPendingChange }: {
  onPhoto: (image: string) => void;
  onClose: () => void;
  onBarcode: () => void;
  onNativeCameraPendingChange?: (pending: boolean) => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const reader = useRef<FileReader | null>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);
  const [session, setSession] = useState(0);
  const [ready, setReady] = useState(false);
  const [opening, setOpening] = useState(true);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torch, setTorch] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let disposed = false;
    const controller = new AbortController();
    const stop = () => {
      controller.abort();
      stream.current?.getTracks().forEach(track => track.stop());
      stream.current = null;
      if (video.current) video.current.srcObject = null;
      setReady(false); setTorch(false); setTorchSupported(false);
    };
    setOpening(true); setError('');
    void (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera not available');
        if (document.hidden) return;
        const media = await openCameraStream(controller.signal);
        if (disposed || controller.signal.aborted || document.visibilityState === 'hidden') { media.getTracks().forEach(track => track.stop()); return; }
        stream.current = media;
        const capabilities = media.getVideoTracks()[0]?.getCapabilities?.() as (MediaTrackCapabilities & { torch?: boolean }) | undefined;
        setTorchSupported(capabilities?.torch === true);
        if (video.current) { video.current.srcObject = media; await video.current.play(); }
        media.getVideoTracks()[0]?.addEventListener('ended', () => {
          if (!disposed && !controller.signal.aborted) { stop(); setError('Camera was interrupted. Please try again.'); }
        }, { once: true });
      } catch (failure) {
        if (!disposed && !controller.signal.aborted) { stop(); setError(cameraError(failure).message); }
      } finally { if (!disposed) setOpening(false); }
    })();
    const visibility = () => {
      if (document.visibilityState === 'hidden') stop();
      else setSession(value => value + 1);
    };
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('pagehide', stop);
    const resume = () => { if (document.visibilityState === 'visible' && controller.signal.aborted) setSession(value => value + 1); };
    window.addEventListener('pageshow', resume);
    return () => { disposed = true; stop(); document.removeEventListener('visibilitychange', visibility); window.removeEventListener('pagehide', stop); window.removeEventListener('pageshow', resume); };
  }, [session]);
  useEffect(() => {
    const input = cameraInput.current;
    const cancelled = () => onNativeCameraPendingChange?.(false);
    input?.addEventListener('cancel', cancelled);
    return () => { reader.current?.abort(); input?.removeEventListener('cancel', cancelled); };
  }, [onNativeCameraPendingChange]);

  const readPhoto = (event: React.ChangeEvent<HTMLInputElement>) => {
    onNativeCameraPendingChange?.(false);
    const file = event.target.files?.[0];
    if (!file) return;
    reader.current?.abort();
    const fileReader = new FileReader(); reader.current = fileReader;
    fileReader.onload = () => onPhoto(String(fileReader.result));
    fileReader.onerror = () => setError('Could not read this photo. Please try again.');
    fileReader.readAsDataURL(file); event.target.value = '';
  };
  const capture = async () => {
    const element = video.current;
    if (ready && element?.videoWidth && element.videoHeight) {
      const canvas = document.createElement('canvas');
      // Capture the same centered crop that object-fit: cover displays in the preview.
      const aspect = element.clientWidth / element.clientHeight;
      const sourceWidth = Math.min(element.videoWidth, element.videoHeight * aspect);
      const sourceHeight = Math.min(element.videoHeight, element.videoWidth / aspect);
      const ratio = Math.min(1, 1280 / Math.max(sourceWidth, sourceHeight));
      canvas.width = Math.round(sourceWidth * ratio); canvas.height = Math.round(sourceHeight * ratio);
      const context = canvas.getContext('2d');
      if (!context) { setError('Could not read this photo. Please try again.'); return; }
      context.drawImage(element, (element.videoWidth - sourceWidth) / 2, (element.videoHeight - sourceHeight) / 2, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);
      onPhoto(canvas.toDataURL('image/jpeg', 0.85));
      return;
    }
    onNativeCameraPendingChange?.(true);
    if (!isNativeApp()) { cameraInput.current?.click(); return; }
    try { const image = await captureMealPhoto(); if (image) onPhoto(image); }
    catch (failure) { setError(cameraError(failure).message); }
    finally { onNativeCameraPendingChange?.(false); }
  };
  const toggleTorch = async () => {
    const track = stream.current?.getVideoTracks()[0];
    if (!torchSupported || !track) return;
    try { await track.applyConstraints({ advanced: [{ torch: !torch } as MediaTrackConstraintSet] }); setTorch(value => !value); }
    catch { setError('Flash is unavailable on this camera.'); }
  };

  return <div className="meal-camera">
    <video ref={video} autoPlay muted playsInline aria-label={t('Meal camera')} onLoadedData={() => { if (stream.current?.active) setReady(true); }} />
    <div className="meal-camera__shade" aria-hidden="true" />
    <header className="meal-camera__header"><button type="button" onClick={onClose}>{t('Cancel')}</button><button type="button" className="icon-command" disabled={!torchSupported} aria-pressed={torch} aria-label={torchSupported ? t('Toggle flash') : t('Flash unavailable')} title={torchSupported ? t('Toggle flash') : t('Flash unavailable')} onClick={() => void toggleTorch()}>{torch ? <Zap size={25} /> : <ZapOff size={25} />}</button></header>
    <div className="meal-camera__frame" aria-hidden="true"><i /><i /><i /><i /></div>
    {!ready && <div className="meal-camera__fallback">{opening ? <><Loader2 size={30} className="animate-spin" /><span>{t('Opening camera...')}</span></> : <><Camera size={38} strokeWidth={1.3} />{error && <p role="alert">{t(String(error))}</p>}<button type="button" className="camera-retry" onClick={() => setSession(value => value + 1)}><RefreshCw size={17} />{t('Try again')}</button></>}</div>}
    {ready && error && <p className="meal-camera__error" role="alert">{t(String(error))}</p>}
    <input ref={cameraInput} type="file" accept="image/*" capture="environment" onChange={readPhoto} aria-label={t('Photograph meal')} hidden />
    <input ref={galleryInput} type="file" accept="image/*" onChange={readPhoto} aria-label={t('Choose meal photo')} hidden />
    <footer className="meal-camera__footer">
      <div className="meal-camera__tip">{t('A clear photo helps us estimate your portion.')}</div>
      <div className="meal-camera__controls">
        <button type="button" className="camera-tool" onClick={() => galleryInput.current?.click()}><Images size={27} strokeWidth={1.5} /><span>{t('Gallery')}</span></button>
        <button type="button" className="camera-shutter" aria-label={t('Take picture of meal')} title={t('Take a photo')} onClick={() => void capture()}><span /></button>
        <button type="button" className="camera-tool" onClick={onBarcode}><ScanBarcode size={27} strokeWidth={1.5} /><span>{t('Barcode')}</span></button>
      </div>
    </footer>
  </div>;
}
