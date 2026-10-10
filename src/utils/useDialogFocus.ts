import { useEffect, useRef } from 'react';

export function useDialogFocus(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLFormElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const element = ref.current;
    const controls = () => Array.from(element?.querySelectorAll<HTMLElement>('button:not(:disabled), input, select, [tabindex="0"]') ?? []);
    controls()[0]?.focus({ preventScroll: true });
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); close.current(); }
      if (event.key !== 'Tab') return;
      const nodes = controls();
      if (event.shiftKey && document.activeElement === nodes[0]) { event.preventDefault(); nodes.at(-1)?.focus(); }
      else if (!event.shiftKey && document.activeElement === nodes.at(-1)) { event.preventDefault(); nodes[0]?.focus(); }
    };
    element?.addEventListener('keydown', keydown);
    return () => { element?.removeEventListener('keydown', keydown); previous?.focus({ preventScroll: true }); };
  }, [open]);
  return ref;
}
