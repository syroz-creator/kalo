export function installViewport() {
  const viewport = window.visualViewport;
  let focusFrame = 0;
  const revealFocusedField = () => {
    cancelAnimationFrame(focusFrame);
    focusFrame = requestAnimationFrame(() => {
      const field = document.activeElement;
      if (field instanceof HTMLElement && field.matches('input, select, textarea, [contenteditable="true"]')) {
        field.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      }
    });
  };
  const fitScreen = () => {
    // The visual viewport also shrinks when the on-screen keyboard opens.
    const height = viewport?.scale === 1 ? viewport.height : window.innerHeight;
    document.documentElement.style.setProperty('--app-height', `${height}px`);
    revealFocusedField();
  };
  const preventZoom = (event: Event) => event.preventDefault();

  fitScreen();
  window.addEventListener('resize', fitScreen);
  window.addEventListener('pageshow', fitScreen);
  viewport?.addEventListener('resize', fitScreen);
  document.addEventListener('focusin', revealFocusedField);
  document.addEventListener('gesturestart', preventZoom, { passive: false });
  document.addEventListener('gesturechange', preventZoom, { passive: false });

  return () => {
    cancelAnimationFrame(focusFrame);
    window.removeEventListener('resize', fitScreen);
    window.removeEventListener('pageshow', fitScreen);
    viewport?.removeEventListener('resize', fitScreen);
    document.removeEventListener('focusin', revealFocusedField);
    document.removeEventListener('gesturestart', preventZoom);
    document.removeEventListener('gesturechange', preventZoom);
  };
}
