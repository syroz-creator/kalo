import { t } from '../i18n';
import { useEffect, useRef, useState } from 'react';
import { Check, ChevronLeft, Eye, EyeOff, Loader2, Trash2 } from 'lucide-react';
import { checkGeminiKey, getGeminiKey, removeGeminiKey, saveGeminiKey } from '../services/mealApi';
import { getUserErrorMessage } from '../utils/userFacingError';

export function GeminiKeySettings({ onBack }: { onBack: () => void }) {
  const [key, setKey] = useState(getGeminiKey);
  const [saved, setSaved] = useState(() => !!getGeminiKey());
  const [visible, setVisible] = useState(false);
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const errorMessage = useRef<HTMLParagraphElement>(null);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => { if (error) errorMessage.current?.scrollIntoView({ block: 'nearest' }); }, [error]);

  const connect = async (event: React.FormEvent) => {
    event.preventDefault();
    const controller = new AbortController();
    request.current?.abort(); request.current = controller;
    setChecking(true); setStatus(''); setError('');
    try {
      await checkGeminiKey(key, controller.signal);
      controller.signal.throwIfAborted();
      setKey(saveGeminiKey(key)); setSaved(true); setVisible(false);
      setStatus('Key saved. Gemini access confirmed.');
    } catch (failure) {
      if (!controller.signal.aborted) setError(getUserErrorMessage(failure, 'We could not check your key right now. Please try again.'));
    } finally { if (!controller.signal.aborted) setChecking(false); }
  };

  const remove = () => {
    setStatus(''); setError('');
    try {
      removeGeminiKey(); setKey(''); setSaved(false); setVisible(false);
      setStatus('API key removed from this device.');
    } catch (failure) { setError(getUserErrorMessage(failure, 'Could not remove your API key. Please try again.')); }
  };

  return <div className="app-scroll settings-page">
    <button type="button" className="text-back" onClick={onBack}><ChevronLeft size={18} />{t("Settings")}</button>
    <h1>{t("Gemini API key")}</h1>
    <form onSubmit={connect}>
      <label className="app-field" htmlFor="gemini-key">{t("API key")}</label>
      <div className="gemini-key-field">
        <input id="gemini-key" dir="ltr" type={visible ? 'text' : 'password'} value={key} onChange={event => { setKey(event.target.value); setStatus(''); setError(''); }} disabled={checking} autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false} />
        <button type="button" aria-label={visible ? t('Hide API key') : t('Show API key')} title={visible ? t('Hide API key') : t('Show API key')} aria-pressed={visible} onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={19} /> : <Eye size={19} />}</button>
      </div>
      <button type="submit" className="primary-command" disabled={checking || !key.trim()}>{checking ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}{checking ? t('Checking...') : t('Check & save')}</button>
    </form>
    {saved && <button type="button" className="text-back" disabled={checking} onClick={remove}><Trash2 size={18} />{t("Remove saved key")}</button>}
    {status && <p role="status" className="settings-note">{t(String(status))}</p>}
    {error && <p ref={errorMessage} role="alert" className="settings-note">{t(String(error))}</p>}
    <a className="text-back" href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">{t("Google AI Studio")}</a>
  </div>;
}
