import { useEffect, useId, useRef, useState } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { Check, ChevronDown, X } from 'lucide-react';
import { languageNames, languages, setLanguage, t, useLanguage, type Language } from '../i18n';
import { useDialogFocus } from '../utils/useDialogFocus';

export function LanguageSelector() {
  const language = useLanguage();
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const close = () => setOpen(false);
  const dialog = useDialogFocus<HTMLDivElement>(open, close);

  useEffect(() => {
    if (!open) return;
    const shell = trigger.current?.closest('.kalo-shell');
    const surfaces = Array.from(shell?.querySelectorAll<HTMLElement>('.app-surface, .app-dialog-layer') ?? []);
    const previous = surfaces.map(element => element.inert);
    surfaces.forEach(element => { element.inert = true; });
    dialog.current?.querySelector<HTMLButtonElement>('[aria-pressed="true"]')?.focus({ preventScroll: true });
    return () => {
      surfaces.forEach((element, index) => { element.inert = previous[index]; });
      trigger.current?.focus({ preventScroll: true });
    };
  }, [open, dialog]);

  const choose = (value: Language) => {
    const apply = () => { setLanguage(value); setOpen(false); };
    if (value !== language && document.startViewTransition && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const transition = document.startViewTransition(() => flushSync(apply));
      void transition.finished.catch(() => { /* Interrupted transitions still apply the selected language. */ });
    } else apply();
  };

  return <>
    <button ref={trigger} type="button" className="language-select" aria-label={t('Language')} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
      <span lang={language === 'ar' ? 'ar-PS' : language}>{languageNames[language]}</span><ChevronDown size={16} />
    </button>
    {open && createPortal(<div className="language-overlay" onClick={event => { if (event.target === event.currentTarget) close(); }} onKeyDown={event => event.stopPropagation()}>
      <div ref={dialog} className="language-panel" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header><h2 id={titleId}>{t('Language')}</h2><button type="button" className="icon-command" aria-label={t('Close')} title={t('Close')} onClick={close}><X size={22} /></button></header>
        <div className="language-options">{languages.map(value => <button type="button" key={value} aria-pressed={language === value} onClick={() => choose(value)}>
          <span lang={value === 'ar' ? 'ar-PS' : value} dir="auto">{languageNames[value]}</span><Check size={20} aria-hidden="true" />
        </button>)}</div>
      </div>
    </div>, trigger.current?.closest('.kalo-shell') ?? document.body)}
  </>;
}
