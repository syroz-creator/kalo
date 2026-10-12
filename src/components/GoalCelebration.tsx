import { t } from '../i18n';
import { useEffect } from 'react';
import { Trophy, X } from 'lucide-react';

export function GoalCelebration({ onClose }: { onClose: () => void }) {
  useEffect(() => { const timer = setTimeout(onClose, 3400); return () => clearTimeout(timer); }, [onClose]);
  return <div className="goal-celebration" role="status" aria-label={t("Daily calorie target reached")}><div className="goal-celebration__message"><Trophy size={56} strokeWidth={1.5} /><h2>{t("Aced it!")}</h2><p>{t("Daily calorie target reached")}</p></div>
    <div className="goal-confetti" aria-hidden="true">{Array.from({ length: 24 }, (_, index) => <i key={index} style={{ '--x': `${(index * 47 % 100) - 50}vw`, '--y': `${-120 - index % 5 * 35}px`, '--turn': `${180 + index * 43}deg`, '--delay': `${index % 4 * 40}ms`, backgroundColor: ['#f9bc35', '#72c9a0', '#ef8fac', '#76bce1'][index % 4] } as React.CSSProperties} />)}</div>
    <button type="button" className="icon-command goal-celebration__close" title={t("Dismiss celebration")} aria-label={t("Dismiss celebration")} onClick={onClose}><X size={22} /></button>
  </div>;
}
