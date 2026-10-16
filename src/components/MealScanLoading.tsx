import { useEffect, useState } from 'react';
import { t } from '../i18n';

const stages = ['Identifying the dish...', 'Estimating portions...', 'Counting your calories...', 'Calculating nutrients...'];
const counting = [
  { language: 'en', text: 'Counting your calories...' },
  { language: 'ar', text: 'عم نعدّ سعراتك...' },
  { language: 'he', text: 'סופרים את הקלוריות...' },
  { language: 'es', text: 'Contando tus calorías...' },
  { language: 'fr', text: 'Calcul des calories...' },
  { language: 'de', text: 'Kalorien werden gezählt...' },
];

export function MealScanLoading({ onCancel }: { onCancel: () => void }) {
  const [step, setStep] = useState(0);
  useEffect(() => { const timer = window.setInterval(() => setStep(value => value + 1), 2200); return () => window.clearInterval(timer); }, []);
  const message = counting[step % counting.length];
  return <div className="scan-loading-backdrop">
    <section className="scan-loading" aria-labelledby="scan-loading-title">
      <h2 id="scan-loading-title">{t('Getting to the good part...')}</h2>
      <div className="scan-loading__illustration" aria-hidden="true"><img src="/icons/scan-butter.svg" alt="" /><span /></div>
      <p className="scan-loading__stage" role="status" aria-live="polite">{t(stages[step % stages.length])}</p>
      <p className="scan-loading__counting" lang={message.language} dir="auto">{message.text}</p>
      <button type="button" onClick={onCancel}>{t('Cancel')}</button>
    </section>
  </div>;
}
