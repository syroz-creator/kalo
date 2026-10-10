import { useEffect } from 'react';

export function OpeningSplash({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onComplete, 3000);
    return () => window.clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="opening-splash" role="status" aria-label="Opening Kalo">
      <div className="opening-splash__brand">
        <img src="/icons/kalo.svg" alt="" width={64} height={64} />
        <span className="opening-splash__name" aria-hidden="true">
          {'kalo'.split('').map((letter, index) => <span key={letter} style={{ animationDelay: `${180 + index * 110}ms` }}>{letter}</span>)}
        </span>
      </div>
      <span className="opening-splash__line" aria-hidden="true" />
    </div>
  );
}
