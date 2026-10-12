import { useSyncExternalStore } from 'react';
import { direction, languageKey, localeFor, readLanguage, translate, type Language } from './core';
export { languages, languageNames, type Language } from './core';

let current = readLanguage();
const listeners = new Set<() => void>();
function applyLanguage() {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = current === 'ar' ? 'ar-PS' : current;
  document.documentElement.dir = direction(current);
}
applyLanguage();
function update(language: Language) {
  current = language; applyLanguage(); listeners.forEach(listener => listener());
}
if (typeof window !== 'undefined') window.addEventListener('storage', event => {
  if (event.key === languageKey || event.key === null) update(readLanguage());
});
export function setLanguage(language: Language) {
  try { localStorage.setItem(languageKey, language); } catch { /* Still usable for this session if preferences cannot be saved. */ }
  update(language);
}
export function getLanguage() { return current; }
export function getLocale() { return localeFor(current); }
export function t(message: string, values?: Record<string, string | number>) { return translate(message, current, values); }
export function useLanguage() {
  return useSyncExternalStore(listener => { listeners.add(listener); return () => { listeners.delete(listener); }; }, getLanguage, () => 'en' as Language);
}
