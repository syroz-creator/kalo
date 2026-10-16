import { t, useLanguage } from './i18n';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Home, TrendingUp, Camera, BookOpen, UserRound } from 'lucide-react';
import type { LoggedItem, MealScanDraft, MealType, UserProfile, WorkoutItem } from './types';
import { exportSavedMealCopies, loadPhotoRecipes, loadRecoverableMeals, loadUserProfile, loadWaterLogs, loadWorkouts, savePhotoRecipes, saveUserProfile, saveWaterLogs, saveWorkouts } from './services/storage';
import { calculateEnergyNeeds } from './utils/calculator';
import { getTodayKey } from './utils/date';
import { TodayTab } from './components/TodayTab';
import { ProgressTab } from './components/ProgressTab';
import { RecipesTab } from './components/RecipesTab';
import { SettingsTab } from './components/SettingsTab';
import { AiMealScanner } from './components/AiMealScanner';
import { EditLoggedModal } from './components/EditLoggedModal';
import { OnboardingModal } from './components/OnboardingModal';
import { ManualMealModal } from './components/ManualMealModal';
import { OpeningSplash } from './components/OpeningSplash';
import { setNativeAppearance } from './services/native';
import { BarcodeMealModal } from './components/BarcodeMealModal';
import './app.css';
import { getUserErrorMessage } from './utils/userFacingError';
import { GoalCelebration } from './components/GoalCelebration';
import { crossesDailyTarget } from './utils/goalCelebration';
import { playSound, setSoundEnabled, unlockSound } from './services/sounds';
import { useMealHistory } from './utils/useMealHistory';
import { archiveMealPhotos, hydrateMealPhotos } from './services/mealPhotoStore';

type ActivePage = 'today' | 'progress' | 'recipes' | 'settings';
function preference(key: string) { try { return localStorage.getItem(key); } catch { return null; } }
const id = () => crypto.randomUUID();

export default function App() {
  useLanguage();
  const [activePage, setActivePage] = useState<ActivePage>('today');
  const [selectedDate, setSelectedDate] = useState(getTodayKey);
  const [userProfile, setUserProfile] = useState<UserProfile>(loadUserProfile);
  const { items: loggedItems, update: setLoggedItems, error: storageError, setError: setStorageError } = useMealHistory();
  const [workouts, setWorkouts] = useState<WorkoutItem[]>(loadWorkouts);
  const [recipes, setRecipes] = useState<LoggedItem[]>(() => loadPhotoRecipes(loggedItems));
  const [waterLogs, setWaterLogs] = useState<Record<string, number>>(loadWaterLogs);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => preference('kalo-theme') === 'light' ? 'light' : 'dark');
  const [reminders, setReminders] = useState(() => preference('kalo-reminders') === 'true');
  const [opening, setOpening] = useState(true);
  const [openingKey, setOpeningKey] = useState(0);
  const finishOpening = useCallback(() => setOpening(false), []);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(() => !userProfile.hasCompletedOnboarding);
  const [isAiSnapModalOpen, setIsAiSnapModalOpen] = useState(false);
  const [barcodeMeal, setBarcodeMeal] = useState<MealType | null>(null);
  const [sounds, setSounds] = useState(() => preference('kalo-sounds') !== 'false');
  const [celebrating, setCelebrating] = useState(false);
  const finishCelebration = useCallback(() => setCelebrating(false), []);
  const [manualMeal, setManualMeal] = useState<MealType | null>(null);
  const [manualMode, setManualMode] = useState<'manual' | 'describe'>('manual');
  const [targetMeal, setTargetMeal] = useState<MealType>('lunch');
  const [editingItem, setEditingItem] = useState<LoggedItem | null>(null);
  const nativeCameraPending = useRef(false);
  const scanOpenRef = useRef(false);
  scanOpenRef.current = isAiSnapModalOpen || !!barcodeMeal;
  const [toast, setToast] = useState<{ message: string; undo?: () => void } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const showToast = (message: string, undo?: () => void) => {
    clearTimeout(toastTimer.current);
    setToast({ message, undo });
    toastTimer.current = setTimeout(() => setToast(null), undo ? 6000 : 3000);
  };
  useEffect(() => () => clearTimeout(toastTimer.current), []);
  useEffect(() => { setSoundEnabled(sounds); try { localStorage.setItem('kalo-sounds', String(sounds)); } catch { /* Sound preferences remain usable without storage. */ } }, [sounds]);
  useEffect(() => {
    const reopen = () => { setOpeningKey(key => key + 1); setOpening(true); };
    const visibility = () => { if (document.visibilityState === 'visible' && !nativeCameraPending.current && !scanOpenRef.current) reopen(); };
    const pageshow = (event: PageTransitionEvent) => { if (event.persisted && !nativeCameraPending.current && !scanOpenRef.current) reopen(); };
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('pageshow', pageshow);
    return () => { document.removeEventListener('visibilitychange', visibility); window.removeEventListener('pageshow', pageshow); };
  }, []);
  useEffect(() => { saveUserProfile(userProfile); }, [userProfile]);
  useEffect(() => { saveWorkouts(workouts); }, [workouts]);
  useEffect(() => {
    let cancelled = false;
    void archiveMealPhotos(recipes).then(() => { if (!cancelled) savePhotoRecipes(loadPhotoRecipes(recipes)); })
      .catch(() => { if (!cancelled) setStorageError('Your meal records are safe, but Recipes could not be saved. Export a backup before closing Kalo.'); });
    void hydrateMealPhotos(recipes).then(items => { if (!cancelled && items !== recipes) setRecipes(items); })
      .catch(() => { if (!cancelled) setStorageError('Some saved photos could not be opened. Your meal records have not been deleted.'); });
    return () => { cancelled = true; };
  }, [recipes, setStorageError]);
  useEffect(() => {
    const reloadRecipes = (event: StorageEvent) => { if (event.key === 'kalo_photo_recipes_v1' || event.key === null) setRecipes(loadPhotoRecipes(loggedItems)); };
    const photosReady = () => setRecipes(loadPhotoRecipes(loggedItems));
    window.addEventListener('storage', reloadRecipes);
    window.addEventListener('kalo-photos-ready', photosReady);
    return () => { window.removeEventListener('storage', reloadRecipes); window.removeEventListener('kalo-photos-ready', photosReady); };
  }, [loggedItems]);
  useEffect(() => { saveWaterLogs(waterLogs); }, [waterLogs]);
  useEffect(() => {
    try { localStorage.setItem('kalo-theme', theme); localStorage.setItem('kalo-reminders', String(reminders)); } catch { /* Preferences remain usable without storage. */ }
  }, [theme, reminders]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#15120d' : '#f6f7f8');
    void setNativeAppearance(theme).catch(() => {});
  }, [theme]);
  useEffect(() => {
    if (!reminders) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible' && 'Notification' in window && Notification.permission === 'granted') new Notification(t('Time for a water break'), { body: t('A little refill for your day.'), icon: '/icons/icon-192.png' });
    }, 60 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, [reminders]);

  const energyNeeds = calculateEnergyNeeds(userProfile);
  const updateRecipes = (change: (items: LoggedItem[]) => LoggedItem[]) => {
    try { const next = change(loadPhotoRecipes(loggedItems)); savePhotoRecipes(next); setRecipes(next); return true; }
    catch (error) { setStorageError(getUserErrorMessage(error, 'Your meal records are saved, but Recipes could not be saved. Export your data before closing Kalo.')); return false; }
  };
  const today = getTodayKey();
  const todayTotal = loggedItems.filter(item => item.date === today).reduce((total, item) => total + item.calories, 0);
  const previousGoal = useRef({ date: today, target: energyNeeds.tdee, total: todayTotal });
  const celebratedDays = useRef<Set<string> | null>(null);
  if (!celebratedDays.current) {
    try { const saved: unknown = JSON.parse(preference('kalo-celebrated-days') || '[]'); celebratedDays.current = new Set(Array.isArray(saved) ? saved.filter(value => typeof value === 'string') : []); }
    catch { celebratedDays.current = new Set(); }
  }
  useEffect(() => {
    const current = { date: today, target: energyNeeds.tdee, total: todayTotal };
    if (crossesDailyTarget(previousGoal.current, current, celebratedDays.current!.has(today))) {
      celebratedDays.current!.add(today);
      try { localStorage.setItem('kalo-celebrated-days', JSON.stringify([...celebratedDays.current!].sort().slice(-30))); } catch { /* Prevent repeated celebrations for this session even without storage. */ }
      setCelebrating(true); playSound('goal');
    }
    previousGoal.current = current;
  }, [today, todayTotal, energyNeeds.tdee]);
  const addMeal = async (item: Omit<LoggedItem, 'id' | 'createdAt'>) => {
    const logged = { ...item, id: id(), createdAt: Date.now() };
    try { await archiveMealPhotos([logged]); }
    catch { setStorageError('This photo could not be saved. Your meal has not been logged yet. Try again or describe it instead.'); return null; }
    if (!setLoggedItems(items => [logged, ...items])) return null;
    showToast('Meal logged'); setActivePage('today');
    return logged;
  };
  const deleteMeal = (itemId: string) => {
    const removed = loggedItems.find(item => item.id === itemId);
    const position = loggedItems.findIndex(item => item.id === itemId);
    if (!setLoggedItems(items => items.filter(item => item.id !== itemId))) return false;
    if (editingItem?.id === itemId) setEditingItem(null);
    playSound('delete');
    showToast(removed ? t('{name} deleted', { name: removed.name }) : 'Meal deleted', removed ? () => setLoggedItems(items => items.some(item => item.id === removed.id) ? items : [...items.slice(0, position), removed, ...items.slice(position)]) : undefined);
    return true;
  };
  const repeatMeal = (item: LoggedItem) => {
    const repeated = { ...item, id: id(), date: selectedDate, createdAt: Date.now() };
    if (!setLoggedItems(items => [repeated, ...items])) return;
    playSound('repeat');
    showToast('Meal logged again', () => setLoggedItems(items => items.filter(entry => entry.id !== repeated.id)));
  };
  const openCamera = () => {
    const hour = new Date().getHours();
    setTargetMeal(hour < 11 ? 'breakfast' : hour < 16 ? 'lunch' : hour < 21 ? 'dinner' : 'snacks');
    setIsAiSnapModalOpen(true);
  };
  const scanItem = (result: MealScanDraft): Omit<LoggedItem, 'id' | 'createdAt'> => ({ foodId: result.foodId, date: selectedDate, meal: result.meal, name: result.dishName, quantity: 1, unit: result.portionDescription || 'portion', calories: result.totalCalories, protein: result.totalProtein, carbs: result.totalCarbs, fat: result.totalFat, source: 'ai_camera', imageUrl: result.imageUrl, ingredients: result.ingredients });
  const logScan = async (result: MealScanDraft) => {
    const logged = await addMeal(scanItem(result));
    if (!logged) return false;
    if (logged.imageUrl) updateRecipes(items => [logged, ...items.filter(item => item.foodId !== logged.foodId)]);
    setIsAiSnapModalOpen(false);
    return true;
  };
  const saveScan = async (result: MealScanDraft) => {
    const recipe = { ...scanItem(result), id: id(), createdAt: Date.now() };
    try { await archiveMealPhotos([recipe]); }
    catch { setStorageError('Your meal could not be saved. Please try again.'); return false; }
    if (!updateRecipes(items => [recipe, ...items.filter(item => item.foodId !== recipe.foodId)])) return false;
    showToast('Meal saved to Recipes');
    return true;
  };
  const logRecipe = (recipe: LoggedItem, meal: MealType) => addMeal({ ...recipe, date: selectedDate, meal });
  const openDescription = (meal: MealType) => {
    setIsAiSnapModalOpen(false);
    setManualMode('describe'); setManualMeal(meal);
  };
  const exportData = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ profile: userProfile, meals: loggedItems, workouts, recipes, water: waterLogs, savedMealCopies: exportSavedMealCopies() }, null, 2)], { type: 'application/json' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `kalo-${getTodayKey()}.json`; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const tabs = [{ key: 'today', label: 'Today', icon: Home }, { key: 'progress', label: 'Progress', icon: TrendingUp }, { key: 'recipes', label: 'Recipes', icon: BookOpen }, { key: 'settings', label: 'Settings', icon: UserRound }] as const;
  const dialogOpen = !!manualMeal || !!editingItem || !!barcodeMeal || isAiSnapModalOpen || isOnboardingOpen;
  return <div className="app-root" onPointerDownCapture={unlockSound} onPointerUpCapture={unlockSound} onClickCapture={unlockSound} onKeyDownCapture={unlockSound}><div className="kalo-shell" data-theme={theme}>
    <div className="app-surface" inert={opening || dialogOpen}>
      <main className="app-main">
        {activePage === 'today' && <TodayTab selectedDate={selectedDate} onSelectDate={setSelectedDate} loggedItems={loggedItems} energyNeeds={energyNeeds} cupsDrank={waterLogs[selectedDate] ?? 0} onUpdateWaterCups={cups => setWaterLogs(logs => ({ ...logs, [selectedDate]: Math.max(0, Math.min(10, cups)) }))} onOpenLogModal={meal => { setManualMode('manual'); setManualMeal(meal); }} onEditItem={setEditingItem} onRepeatItem={repeatMeal} onDeleteItem={deleteMeal} />}
        {activePage === 'progress' && <ProgressTab selectedDate={selectedDate} loggedItems={loggedItems} workouts={workouts} targetCalories={energyNeeds.tdee} onAddWorkout={workout => { setWorkouts(items => [{ ...workout, id: id(), createdAt: Date.now() }, ...items]); showToast('Workout logged'); }} onDeleteWorkout={itemId => setWorkouts(items => items.filter(item => item.id !== itemId))} />}
        {activePage === 'recipes' && <RecipesTab recipes={recipes} onLogRecipeAsMeal={logRecipe} onRemoveRecipe={foodId => updateRecipes(items => items.filter(item => item.foodId !== foodId))} onOpenCamera={openCamera} />}
        {activePage === 'settings' && <SettingsTab profile={userProfile} onSaveProfile={setUserProfile} onOpenOnboarding={() => setIsOnboardingOpen(true)} onClearAllData={() => { if (setLoggedItems(() => [])) { setWorkouts([]); showToast('History cleared'); } }} theme={theme} onThemeChange={setTheme} reminders={reminders} onRemindersChange={setReminders} sounds={sounds} onSoundsChange={setSounds} onExport={exportData} recoverableMeals={loadRecoverableMeals(loggedItems)} onRecoverMeal={item => { const saved = setLoggedItems(items => items.some(meal => meal.id === item.id) ? items : [item, ...items]); if (saved) showToast('Meal restored to its original day'); return saved; }} />}
      </main>
      <nav className="app-nav" aria-label={t("Main navigation")}>{tabs.map((tab, index) => <React.Fragment key={tab.key}>{index === 2 && <button type="button" className="center-camera" title={t("Photograph a meal")} aria-label={t("Take picture of meal")} onClick={openCamera}><Camera size={28} /></button>}<button type="button" aria-current={activePage === tab.key ? 'page' : undefined} onClick={() => setActivePage(tab.key)}><tab.icon size={24} strokeWidth={1.6} /><span>{t(String(tab.label))}</span></button></React.Fragment>)}</nav>
    </div>
    {toast && <div className="app-toast" role="status"><span>{t(String(toast.message))}</span>{toast.undo && <button type="button" onClick={() => { toast.undo?.(); setToast(null); }}>{t("Undo")}</button>}</div>}
    {storageError && <div className="storage-alert" role="alert"><p>{t(String(storageError))}</p><button type="button" onClick={exportData}>{t("Export data")}</button></div>}
    <div inert={opening} className="app-dialog-layer">
      <OnboardingModal isOpen={isOnboardingOpen} initialProfile={userProfile} onComplete={profile => { setUserProfile(profile); setIsOnboardingOpen(false); showToast('Your daily target is set.'); }} />
      {manualMeal && <ManualMealModal meal={manualMeal} initialMode={manualMode} date={selectedDate} onClose={() => setManualMeal(null)} onLog={async item => !!(await addMeal(item))} />}
      <EditLoggedModal isOpen={!!editingItem} item={editingItem} onClose={() => setEditingItem(null)} onUpdate={(itemId, updates) => { if (!setLoggedItems(items => items.map(item => item.id === itemId ? { ...item, ...updates } : item))) return false; updateRecipes(items => items.map(item => item.foodId === editingItem?.foodId ? { ...item, ...updates } : item)); showToast('Meal updated'); return true; }} onDelete={deleteMeal} />
      {isAiSnapModalOpen && <AiMealScanner targetMeal={targetMeal} onChangeTargetMeal={setTargetMeal} onLogMealResult={logScan} onSaveMealResult={saveScan} onBarcode={() => { setIsAiSnapModalOpen(false); setBarcodeMeal(targetMeal); }} onClose={() => setIsAiSnapModalOpen(false)} onNativeCameraPendingChange={pending => { nativeCameraPending.current = pending; }} onDescribeMeal={() => openDescription(targetMeal)} />}
      {barcodeMeal && <BarcodeMealModal date={selectedDate} meal={barcodeMeal} autoStart onBack={() => { setBarcodeMeal(null); setIsAiSnapModalOpen(true); }} onClose={() => setBarcodeMeal(null)} onLog={async item => !!(await addMeal(item))} onManual={() => { setManualMode('manual'); setManualMeal(barcodeMeal); setBarcodeMeal(null); }} />}
    </div>
    {opening && <OpeningSplash key={openingKey} onComplete={finishOpening} />}
    {celebrating && <GoalCelebration onClose={finishCelebration} />}
  </div></div>;
}
