import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, ChevronRight, CircleAlert, Lightbulb, Loader2, Mail, MessageCircle, Send } from 'lucide-react';
import { t } from '../i18n';
import { sendContactMessage, type ContactCategory } from '../services/contact';
import { useDialogFocus } from '../utils/useDialogFocus';
import { getUserErrorMessage } from '../utils/userFacingError';

export function ContactSheet() {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<ContactCategory>('complaint');
  const [replyEmail, setReplyEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const request = useRef<AbortController | null>(null);
  const requestId = useRef('');
  const trigger = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const countId = useId();
  const categoryName = useId();
  const close = () => { request.current?.abort(); request.current = null; setSending(false); setOpen(false); };
  const dialog = useDialogFocus(open, close);
  useEffect(() => () => request.current?.abort(), []);
  const edit = () => { setSent(false); setError(''); requestId.current = ''; };

  useEffect(() => {
    if (!open) return;
    const shell = trigger.current?.closest('.kalo-shell');
    const surfaces = Array.from(shell?.querySelectorAll<HTMLElement>('.app-surface, .app-dialog-layer') ?? []);
    const previous = surfaces.map(element => element.inert);
    surfaces.forEach(element => { element.inert = true; });
    dialog.current?.querySelector<HTMLInputElement>('input:checked')?.focus({ preventScroll: true });
    return () => {
      surfaces.forEach((element, index) => { element.inert = previous[index]; });
      trigger.current?.focus({ preventScroll: true });
    };
  }, [open, dialog]);

  return <>
    <button ref={trigger} type="button" className="settings-row" aria-haspopup="dialog" aria-expanded={open} onClick={() => { setSent(false); setError(''); setOpen(true); }}>
      <span className="settings-symbol"><MessageCircle size={21} /></span><span className="settings-row__label">{t('Contact us')}</span><ChevronRight size={17} />
    </button>
    {open && createPortal(<div className="contact-overlay" onClick={event => { if (event.target === event.currentTarget) close(); }} onKeyDown={event => event.stopPropagation()}>
      <form ref={dialog} className="contact-sheet" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId} aria-busy={sending} onSubmit={async event => {
        event.preventDefault();
        if (!message.trim() || request.current) return;
        const controller = new AbortController(); request.current = controller;
        requestId.current ||= crypto.randomUUID();
        setSending(true); setSent(false); setError('');
        try {
          await sendContactMessage({ category, message, replyEmail, requestId: requestId.current }, controller.signal);
          if (controller.signal.aborted) return;
          setSent(true); setMessage(''); setReplyEmail(''); requestId.current = '';
        } catch (failure) {
          if (!controller.signal.aborted) setError(getUserErrorMessage(failure, 'We could not confirm your message was sent. Your message is still here; try again.'));
        } finally {
          if (request.current === controller) { request.current = null; setSending(false); }
        }
      }}>
        <div className="contact-sheet__handle" aria-hidden="true" />
        <h2 id={titleId}>{t('Contact us')}</h2>
        <p id={descriptionId} className="contact-sheet__intro">{t('Share a problem or an idea for Kalo.')}</p>
        <fieldset className="contact-categories">
          <legend className="sr-only">{t('Message type')}</legend>
          {(['complaint', 'suggestion'] as const).map(value => <label key={value} className={category === value ? 'is-selected' : ''}>
            <input className="sr-only" type="radio" name={categoryName} value={value} disabled={sending} checked={category === value} onChange={() => { setCategory(value); edit(); }} />
            {value === 'complaint' ? <CircleAlert size={20} /> : <Lightbulb size={20} />}<span>{value === 'complaint' ? t('Complaint') : t('Suggestion')}</span>
          </label>)}
        </fieldset>
        <label className="contact-email"><Mail size={20} aria-hidden="true" /><span className="sr-only">{t('Your email (optional)')}</span><input type="email" autoComplete="email" inputMode="email" maxLength={254} disabled={sending} value={replyEmail} placeholder={t('Your email (optional)')} onChange={event => { setReplyEmail(event.target.value); edit(); }} /></label>
        <div className="contact-message">
          <label className="sr-only" htmlFor={`${titleId}-message`}>{t('Your message')}</label>
          <textarea id={`${titleId}-message`} required maxLength={2000} rows={6} dir="auto" disabled={sending} aria-describedby={countId} value={message} placeholder={category === 'complaint' ? t('What went wrong? Any detail helps us fix it faster.') : t('What would you like us to add or change in Kalo?')} onChange={event => { setMessage(event.target.value); edit(); }} />
          <span id={countId} className="contact-message__count" dir="ltr">{message.length} / 2000</span>
        </div>
        {error && <p className="contact-sheet__notice contact-sheet__notice--error" role="alert">{t(String(error))}</p>}
        {sent && <p className="contact-sheet__notice contact-sheet__notice--success" role="status"><CheckCircle2 size={18} />{t('Message sent. Thank you for helping improve Kalo.')}</p>}
        <button type="submit" className="contact-send" disabled={!message.trim() || sending}>{sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}{sending ? t('Sending...') : t('Send')}</button>
        <button type="button" className="contact-cancel" onClick={close}>{sending || sent ? t('Close') : t('Cancel')}</button>
      </form>
    </div>, trigger.current?.closest('.kalo-shell') ?? document.body)}
  </>;
}
