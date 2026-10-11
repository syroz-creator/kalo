import { useEffect } from 'react';

export function OpeningSplash({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Fall back if animation events are suppressed, such as in a background tab.
    const timer = window.setTimeout(onComplete, reducedMotion ? 3000 : 4000);
    return () => window.clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="opening-splash" role="status" aria-label="Opening Kalo" onAnimationEnd={event => {
      if (event.target === event.currentTarget && event.animationName === 'splash-away') onComplete();
    }}>
      <span className="opening-splash__wordmark" aria-hidden="true">Kalo</span>
    </div>
  );
}
