import { messages } from './messages';
import { errorMessages } from './errors';

export type Language = 'en' | 'ar' | 'he';
export const languageKey = 'kalo-language';
export const languages: readonly Language[] = ['en', 'ar', 'he'];
export const languageNames: Record<Language, string> = { en: 'English', ar: 'العربية', he: 'עברית' };
const locales: Record<Language, string> = { en: 'en-US', ar: 'ar-PS-u-nu-latn', he: 'he-IL' };
export function readLanguage(): Language {
  try { const saved = localStorage.getItem(languageKey); return languages.includes(saved as Language) ? saved as Language : 'en'; }
  catch { return 'en'; }
}
export function direction(language: Language) { return language === 'en' ? 'ltr' : 'rtl'; }
export function localeFor(language: Language) { return locales[language]; }
export function translate(message: string, language: Language, values: Record<string, string | number> = {}) {
  const entry = Object.hasOwn(messages, message) ? messages[message] : Object.hasOwn(errorMessages, message) ? errorMessages[message] : undefined;
  const template = language === 'en' || !entry ? message : entry[language === 'ar' ? 0 : 1];
  // A callback keeps replacement characters in user-entered names literal.
  return template.replace(/\{(\w+)\}/g, (placeholder, key: string) => Object.hasOwn(values, key) ? String(values[key]) : placeholder);
}
