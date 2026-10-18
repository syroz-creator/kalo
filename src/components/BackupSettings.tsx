import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, Download, FileUp, Loader2 } from 'lucide-react';
import { t, getLocale } from '../i18n';
import { createBackup, maxBackupBytes, parseBackup, restoreBackup, type KaloBackup } from '../services/backup';
import { getTodayKey } from '../utils/date';
import { getUserErrorMessage, UserFacingError } from '../utils/userFacingError';

export function BackupSettings({ onBack, onRestored }: { onBack: () => void; onRestored: (data: Awaited<ReturnType<typeof restoreBackup>>) => void }) {
  const [backup, setBackup] = useState<KaloBackup | null>(null);
  const [restoreProfile, setRestoreProfile] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const file = useRef<HTMLInputElement>(null);
  const active = useRef(true);
  const lock = useRef(false);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const run = async (work: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(''); setStatus('');
    try { await work(); } catch (failure) { if (active.current) setError(getUserErrorMessage(failure, 'Could not open this backup. Please try again.')); }
    finally { lock.current = false; if (active.current) setBusy(false); }
  };
  const download = () => run(async () => {
    const data = await createBackup();
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    if (blob.size > maxBackupBytes) throw new UserFacingError('This backup exceeds the 100 MB limit. Your records have not been changed.');
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `kalo-${getTodayKey()}.json`;
    document.body.append(anchor); anchor.click(); anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    if (active.current) setStatus('Backup ready. Keep it somewhere private; it includes your photos.');
  });
  return <div className="app-scroll settings-page backup-page" aria-busy={busy}>
    <button type="button" className="text-back" disabled={busy} onClick={onBack}><ChevronLeft size={18} />{t('Settings')}</button>
    <h1>{t('Backup & restore')}</h1>
    <div className="settings-group">
      <button type="button" className="settings-row" disabled={busy} onClick={download}><span className="settings-symbol"><Download size={21} /></span><span className="settings-row__label">{t('Download backup')}</span></button>
      <button type="button" className="settings-row" disabled={busy} onClick={() => file.current?.click()}><span className="settings-symbol"><FileUp size={21} /></span><span className="settings-row__label">{t('Choose backup')}</span></button>
    </div>
    <input ref={file} type="file" accept=".json,application/json" aria-label={t('Choose backup')} hidden onChange={event => {
      const selected = event.target.files?.[0]; event.target.value = ''; if (!selected) return;
      setBackup(null); setRestoreProfile(false);
      void run(async () => {
        if (selected.size > maxBackupBytes) throw new UserFacingError('Choose a backup smaller than 100 MB.');
        const parsed = parseBackup(await selected.text());
        if (active.current) setBackup(parsed);
      });
    }} />
    {backup && <section className="backup-preview"><h2>{t('Backup contents')}</h2>
      <dl>{[[t('Meals'), backup.meals.length], [t('Recipes'), backup.recipes.length], [t('Workouts'), backup.workouts.length], [t('Days of water'), Object.keys(backup.water).length], [t('Progress photos'), backup.bodyProgress.length]].map(([label, count]) => <div key={label}><dt>{label}</dt><dd>{Number(count).toLocaleString(getLocale())}</dd></div>)}</dl>
      <p className="settings-note">{t('Missing records will be added. Existing meals and photos stay unchanged. Water keeps the higher amount for each day.')}</p>
      <label className="backup-profile"><input type="checkbox" checked={restoreProfile} disabled={busy} onChange={event => setRestoreProfile(event.target.checked)} />{t('Use the profile and goals from this backup')}</label>
      <button type="button" className="primary-command" disabled={busy} onClick={() => void run(async () => {
        const restored = await restoreBackup(backup, restoreProfile);
        onRestored(restored);
        if (active.current) { setBackup(null); setStatus('Backup restored. Your existing records were kept.'); }
      })}>{busy ? <Loader2 size={19} className="animate-spin" /> : <FileUp size={19} />}{t('Restore backup')}</button>
    </section>}
    {busy && <p className="settings-note" role="status">{t('Working...')}</p>}
    {error && <p className="settings-note" role="alert">{t(String(error))}</p>}
    {status && <p className="settings-note" role="status">{t(String(status))}</p>}
    <p className="settings-note">{t('Backups include meals, water, workouts and photos. API keys are not included.')}</p>
  </div>;
}
