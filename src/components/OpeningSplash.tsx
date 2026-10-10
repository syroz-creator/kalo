import { useEffect } from 'react';

export function OpeningSplash({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onComplete, 3000);
    return () => window.clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="opening-splash" role="status" aria-label="Opening Kalo">
      <span className="opening-splash__wordmark" aria-hidden="true">Kalo</span>
    </div>
  );
}
