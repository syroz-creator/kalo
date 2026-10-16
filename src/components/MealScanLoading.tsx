import { useEffect, useState } from 'react';
import { t } from '../i18n';
import { ToastAnimation } from './ToastAnimation';

const stages = ['Recognizing your food...', 'Sizing up the portions...', 'Adding up the nutrition...', 'Finishing your meal estimate...'];
const counting = [
  { language: 'en', text: 'Your meal, in numbers...' },
  { language: 'ar', text: 'وجبتك بالأرقام...' },
  { language: 'he', text: 'הארוחה שלך במספרים...' },
  { language: 'es', text: 'Tu comida, en cifras...' },
  { language: 'fr', text: 'Votre repas en chiffres...' },
  { language: 'de', text: 'Dein Essen in Zahlen...' },
];

export function MealScanLoading({ onCancel }: { onCancel: () => void }) {
  const [step, setStep] = useState(0);
  useEffect(() => { const timer = window.setInterval(() => setStep(value => value + 1), 2200); return () => window.clearInterval(timer); }, []);
  const message = counting[step % counting.length];
  return <div className="scan-loading-backdrop">
    <section className="scan-loading" aria-labelledby="scan-loading-title">
      <h2 id="scan-loading-title">{t('Reading your plate...')}</h2>
      <div className="scan-loading__illustration" aria-hidden="true"><ToastAnimation /></div>
      <p className="scan-loading__stage" role="status" aria-live="polite">{t(stages[step % stages.length])}</p>
      <p className="scan-loading__counting" lang={message.language} dir="auto">{message.text}</p>
      <button type="button" onClick={onCancel}>{t('Cancel')}</button>
    </section>
  </div>;
}
