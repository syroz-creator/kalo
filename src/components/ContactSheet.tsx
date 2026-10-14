import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight, CircleAlert, Lightbulb, Mail, MessageCircle, Send } from 'lucide-react';
import { t } from '../i18n';
import { contactEmail, contactEmailLink, type ContactCategory } from '../services/contact';
import { useDialogFocus } from '../utils/useDialogFocus';

export function ContactSheet() {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<ContactCategory>('complaint');
  const [replyEmail, setReplyEmail] = useState('');
  const [message, setMessage] = useState('');
  const [draftOpened, setDraftOpened] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const countId = useId();
  const categoryName = useId();
  const close = () => setOpen(false);
  const dialog = useDialogFocus(open, close);

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
    <button ref={trigger} type="button" className="settings-row" aria-haspopup="dialog" aria-expanded={open} onClick={() => { setDraftOpened(false); setOpen(true); }}>
      <span className="settings-symbol"><MessageCircle size={21} /></span><span className="settings-row__label">{t('Contact us')}</span><ChevronRight size={17} />
    </button>
    {open && createPortal(<div className="contact-overlay" onClick={event => { if (event.target === event.currentTarget) close(); }} onKeyDown={event => event.stopPropagation()}>
      <form ref={dialog} className="contact-sheet" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId} onSubmit={event => {
        event.preventDefault();
        if (!message.trim() || !contactEmail) return;
        window.location.href = contactEmailLink(contactEmail, category, message, replyEmail);
        setDraftOpened(true);
      }}>
        <div className="contact-sheet__handle" aria-hidden="true" />
        <h2 id={titleId}>{t('Contact us')}</h2>
        <p id={descriptionId} className="contact-sheet__intro">{t('Share a problem or an idea for Kalo.')}</p>
        <fieldset className="contact-categories">
          <legend className="sr-only">{t('Message type')}</legend>
          {(['complaint', 'suggestion'] as const).map(value => <label key={value} className={category === value ? 'is-selected' : ''}>
            <input className="sr-only" type="radio" name={categoryName} value={value} checked={category === value} onChange={() => { setCategory(value); setDraftOpened(false); }} />
            {value === 'complaint' ? <CircleAlert size={20} /> : <Lightbulb size={20} />}<span>{value === 'complaint' ? t('Complaint') : t('Suggestion')}</span>
          </label>)}
        </fieldset>
        <label className="contact-email"><Mail size={20} aria-hidden="true" /><span className="sr-only">{t('Your email (optional)')}</span><input type="email" autoComplete="email" inputMode="email" maxLength={254} value={replyEmail} placeholder={t('Your email (optional)')} onChange={event => { setReplyEmail(event.target.value); setDraftOpened(false); }} /></label>
        <div className="contact-message">
          <label className="sr-only" htmlFor={`${titleId}-message`}>{t('Your message')}</label>
          <textarea id={`${titleId}-message`} required maxLength={2000} rows={6} dir="auto" aria-describedby={countId} value={message} placeholder={category === 'complaint' ? t('What went wrong? Any detail helps us fix it faster.') : t('What would you like us to add or change in Kalo?')} onChange={event => { setMessage(event.target.value); setDraftOpened(false); }} />
          <span id={countId} className="contact-message__count" dir="ltr">{message.length} / 2000</span>
        </div>
        {!contactEmail && <p className="contact-sheet__notice" role="status">{t('Contact is being set up. Please try again later.')}</p>}
        {draftOpened && <p className="contact-sheet__notice" role="status">{t('Finish sending in your email app. Your message is still here.')}</p>}
        <button type="submit" className="contact-send" disabled={!message.trim() || !contactEmail}><Send size={18} />{t('Send')}</button>
        <button type="button" className="contact-cancel" onClick={close}>{t('Cancel')}</button>
      </form>
    </div>, trigger.current?.closest('.kalo-shell') ?? document.body)}
  </>;
}
