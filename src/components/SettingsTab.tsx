import { t, getLocale } from '../i18n';
import { useState } from 'react';
import { Bell, ChevronLeft, ChevronRight, Download, Globe, KeyRound, Moon, RotateCcw, Sun, Target, Trash2, Volume2 } from 'lucide-react';
import type { LoggedItem, UserProfile } from '../types';
import { calculateEnergyNeeds } from '../utils/calculator';
import { PlanSettings } from './PlanSettings';
import { GeminiKeySettings } from './GeminiKeySettings';
import { LanguageSelector } from './LanguageSelector';
import { ContactSheet } from './ContactSheet';

interface SettingsTabProps {
  profile: UserProfile;
  onSaveProfile: (profile: UserProfile) => void;
  onOpenOnboarding: () => void;
  onClearAllData: () => void;
  theme: 'dark' | 'light';
  onThemeChange: (theme: 'dark' | 'light') => void;
  reminders: boolean;
  onRemindersChange: (enabled: boolean) => void;
  sounds: boolean;
  onSoundsChange: (enabled: boolean) => void;
  onExport: () => void;
  recoverableMeals: LoggedItem[];
  onRecoverMeal: (item: LoggedItem) => boolean;
}

export function SettingsTab(props: SettingsTabProps) {
  const [view, setView] = useState<'main' | 'plan' | 'notifications' | 'gemini' | 'recovery'>('main');
  const [permissionError, setPermissionError] = useState('');
  const calories = calculateEnergyNeeds(props.profile).tdee;
  const enableReminders = async () => {
    setPermissionError('');
    if (props.reminders) { props.onRemindersChange(false); return; }
    if (!('Notification' in window)) { setPermissionError('Notifications are unavailable in this browser.'); return; }
    const permission = await Notification.requestPermission();
    if (permission === 'granted') props.onRemindersChange(true);
    else setPermissionError('Notifications are blocked. Allow them in your browser settings to turn reminders on.');
  };
  if (view === 'plan') return <div className="settings-plan"><button type="button" className="text-back" onClick={() => setView('main')}><ChevronLeft size={18} />{t("Settings")}</button><PlanSettings profile={props.profile} onSaveProfile={props.onSaveProfile} onOpenOnboarding={props.onOpenOnboarding} onClearAllData={props.onClearAllData} /></div>;
  if (view === 'gemini') return <GeminiKeySettings onBack={() => setView('main')} />;
  if (view === 'recovery') return <div className="app-scroll settings-page"><button type="button" className="text-back" onClick={() => setView('main')}><ChevronLeft size={18} />{t("Settings")}</button><h1>{t("Recover meals")}</h1>{!props.recoverableMeals.length && <p className="settings-note">{t("No recoverable meals found on this device.")}</p>}<div className="meal-recovery-list">{props.recoverableMeals.map(item => <div className="meal-recovery-row" key={item.id}><div><strong>{item.name}</strong><small>{item.date} · {Math.round(item.calories)} {t("kcal")}</small></div><button type="button" className="icon-command" aria-label={t('Restore {name} from {date}', { name: item.name, date: item.date })} title={t("Restore meal")} onClick={() => props.onRecoverMeal(item)}><RotateCcw size={21} /></button></div>)}</div></div>;
  if (view === 'notifications') return <div className="app-scroll settings-page"><button type="button" className="text-back" onClick={() => setView('main')}><ChevronLeft size={18} />{t("Settings")}</button><h1>{t("Notifications")}</h1><div className="settings-group"><div className="settings-row"><span className="settings-symbol"><Bell size={21} /></span><span className="settings-row__label">{t("Water reminders")}<small>{t("Hourly, while Kalo is open")}</small></span><button type="button" role="switch" aria-label={t("Water reminders")} aria-checked={props.reminders} onClick={enableReminders} className={`app-switch ${props.reminders ? 'is-on' : ''}`}><span /></button></div></div>{permissionError && <p role="alert" className="settings-note">{t(String(permissionError))}</p>}</div>;
  return (
    <div className="app-scroll settings-page">
      <h1>{t("Settings")}</h1>
      <section><h2>{t("My plan")}</h2><div className="settings-group"><button type="button" className="settings-row" onClick={() => setView('plan')}><span className="settings-symbol"><Target size={21} /></span><span className="settings-row__label">{t("Goals & nutrition")}</span><span className="settings-row__value">{calories.toLocaleString(getLocale())}</span><ChevronRight size={17} /></button></div></section>
      <section><h2>{t("App")}</h2><div className="settings-group">
        <div className="settings-row"><span className="settings-symbol"><Moon size={21} /></span><span className="settings-row__label">{t("Appearance")}</span><button type="button" role="switch" aria-label={t("Dark appearance")} aria-checked={props.theme === 'dark'} onClick={() => props.onThemeChange(props.theme === 'dark' ? 'light' : 'dark')} className="appearance-switch"><Sun size={15} /><Moon size={15} /><span className={props.theme === 'dark' ? 'is-dark' : ''}>{props.theme === 'dark' ? <Moon size={14} /> : <Sun size={14} />}</span></button></div>
        <div className="settings-row"><span className="settings-symbol"><Volume2 size={21} /></span><span className="settings-row__label">{t("Sound effects")}</span><button type="button" role="switch" aria-label={t("Sound effects")} aria-checked={props.sounds} onClick={() => props.onSoundsChange(!props.sounds)} className={`app-switch ${props.sounds ? 'is-on' : ''}`}><span /></button></div>
        <div className="settings-row"><span className="settings-symbol"><Globe size={21} /></span><span className="settings-row__label">{t("Language")}</span><LanguageSelector /></div>
        <button type="button" className="settings-row" onClick={() => setView('notifications')}><span className="settings-symbol"><Bell size={21} /></span><span className="settings-row__label">{t("Notifications")}</span><ChevronRight size={17} /></button>
        <button type="button" className="settings-row" onClick={() => setView('gemini')}><span className="settings-symbol"><KeyRound size={21} /></span><span className="settings-row__label">{t("Gemini API key")}</span><ChevronRight size={17} /></button>
        <ContactSheet />
      </div></section>
      <section><h2>{t("Your data")}</h2><div className="settings-group">
        <button type="button" className="settings-row" onClick={props.onExport}><span className="settings-symbol"><Download size={21} /></span><span className="settings-row__label">{t("Export my data")}</span><ChevronRight size={17} /></button>
        <button type="button" className="settings-row" onClick={() => setView('recovery')}><span className="settings-symbol"><RotateCcw size={21} /></span><span className="settings-row__label">{t("Recover meals")}</span><span className="settings-row__value">{props.recoverableMeals.length}</span><ChevronRight size={17} /></button>
        <button type="button" className="settings-row" onClick={() => { if (window.confirm(t('Clear all logged meals and workouts from your history?'))) props.onClearAllData(); }}><span className="settings-symbol settings-symbol--health"><Trash2 size={21} /></span><span className="settings-row__label">{t("Clear meal & workout history")}</span><ChevronRight size={17} /></button>
      </div></section>
      <p className="settings-note">{t("Your records are saved on this device. Export a copy to keep a backup.")}</p>
    </div>
  );
}
