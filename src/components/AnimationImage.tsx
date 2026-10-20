import { useEffect, useState } from 'react';

export function AnimationImage({ name, className, width, height, onLoad }: {
  name: 'opening' | 'toast'; className: string; width: number; height: number; onLoad?: () => void;
}) {
  const readTheme = () => typeof document !== 'undefined' && document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
  const [theme, setTheme] = useState(readTheme);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const reload = () => setTheme(readTheme());
    reload();
    const observer = new MutationObserver(reload);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);
  const base = `/animations/${name}-${theme}`;
  return <picture className={className} aria-hidden="true">
    <source media="(prefers-reduced-motion: reduce)" srcSet={`${base}.png`} />
    <img src={`${base}.${failed ? 'png' : 'gif'}`} width={width} height={height} alt="" draggable={false} onLoad={onLoad} onError={() => setFailed(true)} />
  </picture>;
}
