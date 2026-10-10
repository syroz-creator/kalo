import { useEffect, useRef, useState } from 'react';
import { Check, ChevronLeft, Eye, EyeOff, Loader2, Trash2 } from 'lucide-react';
import { checkGeminiKey, getGeminiKey, removeGeminiKey, saveGeminiKey } from '../services/mealApi';

export function GeminiKeySettings({ onBack }: { onBack: () => void }) {
  const [key, setKey] = useState(getGeminiKey);
  const [saved, setSaved] = useState(() => !!getGeminiKey());
  const [visible, setVisible] = useState(false);
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);

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
      if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : 'Could not check your API key.');
    } finally { if (!controller.signal.aborted) setChecking(false); }
  };

  const remove = () => {
    setStatus(''); setError('');
    try {
      removeGeminiKey(); setKey(''); setSaved(false); setVisible(false);
      setStatus('API key removed from this device.');
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not remove your API key.'); }
  };

  return <div className="app-scroll settings-page">
    <button type="button" className="text-back" onClick={onBack}><ChevronLeft size={18} />Settings</button>
    <h1>Gemini API key</h1>
    <form onSubmit={connect}>
      <label className="app-field" htmlFor="gemini-key">API key</label>
      <div className="gemini-key-field">
        <input id="gemini-key" type={visible ? 'text' : 'password'} value={key} onChange={event => { setKey(event.target.value); setStatus(''); setError(''); }} disabled={checking} autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false} />
        <button type="button" aria-label={visible ? 'Hide API key' : 'Show API key'} title={visible ? 'Hide API key' : 'Show API key'} aria-pressed={visible} onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={19} /> : <Eye size={19} />}</button>
      </div>
      <button type="submit" className="primary-command" disabled={checking || !key.trim()}>{checking ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}{checking ? 'Checking...' : 'Check & save'}</button>
    </form>
    {saved && <button type="button" className="text-back" disabled={checking} onClick={remove}><Trash2 size={18} />Remove saved key</button>}
    {status && <p role="status" className="settings-note">{status}</p>}
    {error && <p role="alert" className="settings-note">{error}</p>}
    <a className="text-back" href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">Google AI Studio</a>
  </div>;
}
