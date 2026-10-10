import { useState } from 'react';
import { Bell, ChevronLeft, ChevronRight, Download, Globe, Heart, KeyRound, Moon, Sun, Target, Trash2 } from 'lucide-react';
import type { UserProfile } from '../types';
import { calculateEnergyNeeds } from '../utils/calculator';
import { PlanSettings } from './PlanSettings';
import { GeminiKeySettings } from './GeminiKeySettings';

interface SettingsTabProps {
  profile: UserProfile;
  onSaveProfile: (profile: UserProfile) => void;
  onOpenOnboarding: () => void;
  onClearAllData: () => void;
  theme: 'dark' | 'light';
  onThemeChange: (theme: 'dark' | 'light') => void;
  reminders: boolean;
  onRemindersChange: (enabled: boolean) => void;
  onExport: () => void;
}

export function SettingsTab(props: SettingsTabProps) {
  const [view, setView] = useState<'main' | 'plan' | 'notifications' | 'gemini'>('main');
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
  if (view === 'plan') return <div className="settings-plan"><button type="button" className="text-back" onClick={() => setView('main')}><ChevronLeft size={18} />Settings</button><PlanSettings profile={props.profile} onSaveProfile={props.onSaveProfile} onOpenOnboarding={props.onOpenOnboarding} onClearAllData={props.onClearAllData} /></div>;
  if (view === 'gemini') return <GeminiKeySettings onBack={() => setView('main')} />;
  if (view === 'notifications') return <div className="app-scroll settings-page"><button type="button" className="text-back" onClick={() => setView('main')}><ChevronLeft size={18} />Settings</button><h1>Notifications</h1><div className="settings-group"><div className="settings-row"><span className="settings-symbol"><Bell size={21} /></span><span className="settings-row__label">Water reminders<small>Hourly, while Kalo is open</small></span><button type="button" role="switch" aria-label="Water reminders" aria-checked={props.reminders} onClick={enableReminders} className={`app-switch ${props.reminders ? 'is-on' : ''}`}><span /></button></div></div>{permissionError && <p role="alert" className="settings-note">{permissionError}</p>}</div>;
  return (
    <div className="app-scroll settings-page">
      <h1>Settings</h1>
      <section><h2>My plan</h2><div className="settings-group"><button type="button" className="settings-row" onClick={() => setView('plan')}><span className="settings-symbol"><Target size={21} /></span><span className="settings-row__label">Goals & nutrition</span><span className="settings-row__value">{calories.toLocaleString('en-US')}</span><ChevronRight size={17} /></button></div></section>
      <section><h2>Health</h2><div className="settings-group"><div className="settings-row is-unavailable"><span className="settings-symbol settings-symbol--health"><Heart size={21} /></span><span className="settings-row__label">Apple Health</span><span className="settings-coming">Coming soon</span></div></div></section>
      <section><h2>App</h2><div className="settings-group">
        <div className="settings-row"><span className="settings-symbol"><Moon size={21} /></span><span className="settings-row__label">Appearance</span><button type="button" role="switch" aria-label="Dark appearance" aria-checked={props.theme === 'dark'} onClick={() => props.onThemeChange(props.theme === 'dark' ? 'light' : 'dark')} className="appearance-switch"><Sun size={15} /><Moon size={15} /><span className={props.theme === 'dark' ? 'is-dark' : ''}>{props.theme === 'dark' ? <Moon size={14} /> : <Sun size={14} />}</span></button></div>
        <div className="settings-row"><span className="settings-symbol"><Globe size={21} /></span><span className="settings-row__label">Language</span><span className="settings-row__value">English</span></div>
        <button type="button" className="settings-row" onClick={() => setView('notifications')}><span className="settings-symbol"><Bell size={21} /></span><span className="settings-row__label">Notifications</span><ChevronRight size={17} /></button>
        <button type="button" className="settings-row" onClick={() => setView('gemini')}><span className="settings-symbol"><KeyRound size={21} /></span><span className="settings-row__label">Gemini API key</span><ChevronRight size={17} /></button>
      </div></section>
      <section><h2>Your data</h2><div className="settings-group">
        <button type="button" className="settings-row" onClick={props.onExport}><span className="settings-symbol"><Download size={21} /></span><span className="settings-row__label">Export my data</span><ChevronRight size={17} /></button>
        <button type="button" className="settings-row" onClick={() => { if (window.confirm('Delete all logged meals and workouts? This cannot be undone.')) props.onClearAllData(); }}><span className="settings-symbol settings-symbol--health"><Trash2 size={21} /></span><span className="settings-row__label">Clear meal & workout history</span><ChevronRight size={17} /></button>
      </div></section>
      <p className="settings-note">Your records are saved on this device. Export a copy to keep a backup.</p>
    </div>
  );
}
