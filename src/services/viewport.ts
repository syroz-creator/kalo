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
  viewport?.addEventListener('resize', fitScreen);
  document.addEventListener('focusin', fitScreen);
  document.addEventListener('focusout', fitScreen);
  document.addEventListener('gesturestart', preventZoom, { passive: false });
  document.addEventListener('gesturechange', preventZoom, { passive: false });

  return () => {
    cancelAnimationFrame(focusFrame);
    window.removeEventListener('resize', fitScreen);
    window.removeEventListener('pageshow', fitScreen);
    viewport?.removeEventListener('resize', fitScreen);
    document.removeEventListener('focusin', fitScreen);
    document.removeEventListener('focusout', fitScreen);
    document.removeEventListener('gesturestart', preventZoom);
    document.removeEventListener('gesturechange', preventZoom);
  };
}
