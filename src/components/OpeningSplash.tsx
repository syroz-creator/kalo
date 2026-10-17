import { t } from '../i18n';
import { useCallback, useEffect, useRef } from 'react';
import { ArrowRight } from 'lucide-react';

export const openingDurationMs = 3400;

export function OpeningSplash({ onComplete }: { onComplete: () => void }) {
  const callback = useRef(onComplete);
  callback.current = onComplete;
  const completed = useRef(false);
  const complete = useCallback(() => {
    if (completed.current) return;
    completed.current = true;
    callback.current();
  }, []);

  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    // Fall back if animation events are suppressed, such as in a background tab.
    const timer = window.setTimeout(complete, motion.matches ? 150 : openingDurationMs + 400);
    const preferenceChanged = () => { if (motion.matches) complete(); };
    const keydown = (event: KeyboardEvent) => { if (event.key === 'Escape') complete(); };
    motion.addEventListener('change', preferenceChanged);
    window.addEventListener('keydown', keydown);
    return () => { window.clearTimeout(timer); motion.removeEventListener('change', preferenceChanged); window.removeEventListener('keydown', keydown); };
  }, [complete]);

  return (
    <div className="opening-splash" role="status" aria-label={t("Opening Kalo")} style={{ '--opening-duration': `${openingDurationMs}ms` } as React.CSSProperties} onAnimationEnd={event => {
      if (event.target === event.currentTarget && event.animationName === 'splash-away') complete();
    }}>
      <svg className="opening-splash__scene" viewBox="0 0 400 320" aria-hidden="true" focusable="false">
        <g className="opening-splash__fork" fill="none" stroke="var(--water)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M85 88v35a13 13 0 0 0 26 0V88m-13 0v112" />
        </g>
        <g className="opening-splash__spoon" fill="none" stroke="var(--water)" strokeWidth="5" strokeLinecap="round">
          <ellipse cx="302" cy="108" rx="13" ry="23" /><path d="M302 131v69" />
        </g>
        <g className="opening-splash__plate">
          <circle className="opening-splash__dish" cx="200" cy="138" r="67" />
          <circle className="opening-splash__rim" cx="200" cy="138" r="53" fill="none" stroke="var(--border)" strokeWidth="2" />
          <circle className="opening-splash__outline" cx="200" cy="138" r="67" fill="none" stroke="var(--gold)" strokeWidth="6" strokeLinecap="round" pathLength="1" />
          <g className="opening-splash__apple">
            <path d="M200 125c-12-10-34-5-39 13-8 31 11 60 37 60 28 0 47-31 39-60-5-18-25-23-37-13Z" fill="var(--fat)" />
            <path d="M173 141c-4 8-3 17 0 23" fill="none" stroke="var(--bg)" strokeOpacity=".22" strokeWidth="4" strokeLinecap="round" />
            <path d="M200 126q-3-17-14-24" fill="none" stroke="var(--text)" strokeWidth="4" strokeLinecap="round" />
            <path className="opening-splash__leaf" d="M201 116c-1-26 15-42 40-42 1 26-15 42-40 42Z" fill="var(--gold)" />
          </g>
        </g>
        <g className="opening-splash__letters" fill="var(--gold)">
          {t('Kalo').slice(0, -1).split('').map((letter, index) => <text key={index} className={`opening-splash__letter opening-splash__letter--${index}`} x={[91, 156.45, 213.43][index]} y="205">{letter}</text>)}
          <text className="opening-splash__o" x="246.54" y="205">{t('Kalo').slice(-1)}</text>
        </g>
      </svg>
      <span className="opening-splash__wordmark" aria-hidden="true">{t("Kalo")}</span>
      <button type="button" className="opening-splash__skip icon-command" aria-label={t('Skip intro')} title={t('Skip intro')} onClick={complete}><ArrowRight size={20} /></button>
    </div>
  );
}
