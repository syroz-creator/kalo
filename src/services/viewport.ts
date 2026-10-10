export function installViewport() {
  const viewport = window.visualViewport;
  const standalone = window.matchMedia('(display-mode: standalone), (display-mode: fullscreen)');
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
    // iOS also exposes standalone through navigator when the media query is stale.
    document.documentElement.dataset.standalone = String(standalone.matches || (window.navigator as Navigator & { standalone?: boolean }).standalone === true);
    const field = document.activeElement;
    const editing = field instanceof HTMLElement && field.matches('input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="file"]), textarea, [contenteditable="true"]');
    const layoutHeight = document.documentElement.clientHeight;
    // Safari's Home Screen visual viewport can exclude the status-bar area.
    // Override CSS height only for a keyboard-sized reduction while editing.
    if (editing && viewport?.scale === 1 && layoutHeight - viewport.height > 150) {
      const height = Math.min(layoutHeight, viewport.height + viewport.offsetTop);
      document.documentElement.style.setProperty('--app-height', `${height}px`);
    } else {
      document.documentElement.style.removeProperty('--app-height');
    }
    revealFocusedField();
  };
  const preventZoom = (event: Event) => event.preventDefault();

  fitScreen();
  window.addEventListener('resize', fitScreen);
  window.addEventListener('pageshow', fitScreen);
  window.addEventListener('orientationchange', fitScreen);
  standalone.addEventListener('change', fitScreen);
  document.addEventListener('visibilitychange', fitScreen);
  viewport?.addEventListener('resize', fitScreen);
  document.addEventListener('focusin', fitScreen);
  document.addEventListener('focusout', fitScreen);
  document.addEventListener('gesturestart', preventZoom, { passive: false });
  document.addEventListener('gesturechange', preventZoom, { passive: false });

  return () => {
    cancelAnimationFrame(focusFrame);
    window.removeEventListener('resize', fitScreen);
    window.removeEventListener('pageshow', fitScreen);
    window.removeEventListener('orientationchange', fitScreen);
    standalone.removeEventListener('change', fitScreen);
    document.removeEventListener('visibilitychange', fitScreen);
    viewport?.removeEventListener('resize', fitScreen);
    document.removeEventListener('focusin', fitScreen);
    document.removeEventListener('focusout', fitScreen);
    document.removeEventListener('gesturestart', preventZoom);
    document.removeEventListener('gesturechange', preventZoom);
    delete document.documentElement.dataset.standalone;
  };
}
