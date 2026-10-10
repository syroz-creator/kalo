import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Home, TrendingUp, Camera, BookOpen, UserRound, X } from 'lucide-react';
import type { AnalyzedFoodItem, LoggedItem, MealType, UserProfile, WorkoutItem } from './types';
import { loadLoggedItems, loadPhotoRecipes, loadUserProfile, loadWaterLogs, loadWorkouts, saveLoggedItems, savePhotoRecipes, saveUserProfile, saveWaterLogs, saveWorkouts } from './services/storage';
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
import './app.css';

type ActivePage = 'today' | 'progress' | 'recipes' | 'settings';
function preference(key: string) { try { return localStorage.getItem(key); } catch { return null; } }
const id = () => crypto.randomUUID();

export default function App() {
  const [activePage, setActivePage] = useState<ActivePage>('today');
  const [selectedDate, setSelectedDate] = useState(getTodayKey);
  const [userProfile, setUserProfile] = useState<UserProfile>(loadUserProfile);
  const [loggedItems, setLoggedItems] = useState<LoggedItem[]>(loadLoggedItems);
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
  const [manualMeal, setManualMeal] = useState<MealType | null>(null);
  const [targetMeal, setTargetMeal] = useState<MealType>('lunch');
  const [snappedInitialImage, setSnappedInitialImage] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<LoggedItem | null>(null);
  const directCameraInputRef = useRef<HTMLInputElement>(null);
  const nativeCameraPending = useRef(false);
  const scanOpenRef = useRef(false);
  scanOpenRef.current = isAiSnapModalOpen;
  const [toast, setToast] = useState<{ message: string; undo?: () => void } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const showToast = (message: string, undo?: () => void) => {
    clearTimeout(toastTimer.current);
    setToast({ message, undo });
    toastTimer.current = setTimeout(() => setToast(null), undo ? 6000 : 3000);
  };
  useEffect(() => () => clearTimeout(toastTimer.current), []);
  useEffect(() => {
    const input = directCameraInputRef.current;
    const cancel = () => { nativeCameraPending.current = false; };
    input?.addEventListener('cancel', cancel);
    return () => input?.removeEventListener('cancel', cancel);
  }, []);
  useEffect(() => {
    const reopen = () => { setOpeningKey(key => key + 1); setOpening(true); };
    const visibility = () => { if (document.visibilityState === 'visible' && !nativeCameraPending.current && !scanOpenRef.current) reopen(); };
    const pageshow = (event: PageTransitionEvent) => { if (event.persisted && !nativeCameraPending.current && !scanOpenRef.current) reopen(); };
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('pageshow', pageshow);
    return () => { document.removeEventListener('visibilitychange', visibility); window.removeEventListener('pageshow', pageshow); };
  }, []);
  useEffect(() => { saveUserProfile(userProfile); }, [userProfile]);
  useEffect(() => { saveLoggedItems(loggedItems); }, [loggedItems]);
  useEffect(() => { saveWorkouts(workouts); }, [workouts]);
  useEffect(() => { savePhotoRecipes(recipes); }, [recipes]);
  useEffect(() => { saveWaterLogs(waterLogs); }, [waterLogs]);
  useEffect(() => {
    try { localStorage.setItem('kalo-theme', theme); localStorage.setItem('kalo-reminders', String(reminders)); } catch { /* Preferences remain usable without storage. */ }
  }, [theme, reminders]);
  useEffect(() => {
    if (!reminders) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible' && 'Notification' in window && Notification.permission === 'granted') new Notification('Time for a water break', { body: 'A little refill for your day.', icon: '/icons/icon-192.png' });
    }, 60 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, [reminders]);

  const energyNeeds = calculateEnergyNeeds(userProfile);
  const addMeal = (item: Omit<LoggedItem, 'id' | 'createdAt'>) => {
    const logged = { ...item, id: id(), createdAt: Date.now() };
    setLoggedItems(items => [logged, ...items]);
    showToast('Meal logged'); setActivePage('today');
    return logged;
  };
  const deleteMeal = (itemId: string) => {
    const removed = loggedItems.find(item => item.id === itemId);
    setLoggedItems(items => items.filter(item => item.id !== itemId));
    showToast('Meal removed', removed ? () => setLoggedItems(items => items.some(item => item.id === removed.id) ? items : [...items, removed]) : undefined);
  };
  const repeatMeal = (item: LoggedItem) => {
    const repeated = { ...item, id: id(), date: selectedDate, createdAt: Date.now() };
    setLoggedItems(items => [repeated, ...items]);
    showToast('Meal logged again', () => setLoggedItems(items => items.filter(entry => entry.id !== repeated.id)));
  };
  const handlePhoto = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) { nativeCameraPending.current = false; return; }
    const reader = new FileReader();
    reader.onload = () => { nativeCameraPending.current = false; setOpening(false); setSnappedInitialImage(reader.result as string); setIsAiSnapModalOpen(true); };
    reader.onerror = () => { nativeCameraPending.current = false; showToast('Could not read this photo. Please try again.'); };
    reader.readAsDataURL(file); event.target.value = '';
  };
  const openCamera = () => {
    const hour = new Date().getHours();
    setTargetMeal(hour < 11 ? 'breakfast' : hour < 16 ? 'lunch' : hour < 21 ? 'dinner' : 'snacks');
    nativeCameraPending.current = true;
    directCameraInputRef.current?.click();
  };
  const logScan = (result: { meal: MealType; dishName: string; totalCalories: number; totalProtein: number; totalCarbs: number; totalFat: number; portionDescription: string; imageUrl?: string; ingredients?: AnalyzedFoodItem[] }) => {
    const logged = addMeal({ foodId: `ai-${id()}`, date: selectedDate, meal: result.meal, name: result.dishName, quantity: 1, unit: result.portionDescription || 'portion', calories: result.totalCalories, protein: result.totalProtein, carbs: result.totalCarbs, fat: result.totalFat, source: 'ai_camera', imageUrl: result.imageUrl, ingredients: result.ingredients });
    if (logged.imageUrl) setRecipes(items => [logged, ...items]);
    setIsAiSnapModalOpen(false);
  };
  const logRecipe = (recipe: LoggedItem, meal: MealType) => addMeal({ ...recipe, date: selectedDate, meal });
  const exportData = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ profile: userProfile, meals: loggedItems, workouts, recipes, water: waterLogs }, null, 2)], { type: 'application/json' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `kalo-${getTodayKey()}.json`; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const tabs = [{ key: 'today', label: 'Today', icon: Home }, { key: 'progress', label: 'Progress', icon: TrendingUp }, { key: 'recipes', label: 'Recipes', icon: BookOpen }, { key: 'settings', label: 'Settings', icon: UserRound }] as const;
  const dialogOpen = !!manualMeal || !!editingItem || isAiSnapModalOpen || isOnboardingOpen;
  return <div className="app-root"><div className="kalo-shell" data-theme={theme}>
    <div className="app-surface" inert={opening || dialogOpen}>
      <main className="app-main">
        {activePage === 'today' && <TodayTab selectedDate={selectedDate} onSelectDate={setSelectedDate} loggedItems={loggedItems} energyNeeds={energyNeeds} cupsDrank={waterLogs[selectedDate] ?? 0} onUpdateWaterCups={cups => setWaterLogs(logs => ({ ...logs, [selectedDate]: Math.max(0, Math.min(10, cups)) }))} onOpenLogModal={setManualMeal} onEditItem={setEditingItem} onRepeatItem={repeatMeal} onDeleteItem={deleteMeal} />}
        {activePage === 'progress' && <ProgressTab selectedDate={selectedDate} loggedItems={loggedItems} workouts={workouts} targetCalories={energyNeeds.tdee} onAddWorkout={workout => { setWorkouts(items => [{ ...workout, id: id(), createdAt: Date.now() }, ...items]); showToast('Workout logged'); }} onDeleteWorkout={itemId => setWorkouts(items => items.filter(item => item.id !== itemId))} />}
        {activePage === 'recipes' && <RecipesTab recipes={recipes} onLogRecipeAsMeal={logRecipe} onRemoveRecipe={foodId => setRecipes(items => items.filter(item => item.foodId !== foodId))} onOpenCamera={openCamera} />}
        {activePage === 'settings' && <SettingsTab profile={userProfile} onSaveProfile={setUserProfile} onOpenOnboarding={() => setIsOnboardingOpen(true)} onClearAllData={() => { setLoggedItems([]); setWorkouts([]); showToast('History cleared'); }} theme={theme} onThemeChange={setTheme} reminders={reminders} onRemindersChange={setReminders} onExport={exportData} />}
      </main>
      <nav className="app-nav" aria-label="Main navigation">{tabs.map((tab, index) => <React.Fragment key={tab.key}>{index === 2 && <button type="button" className="center-camera" title="Photograph a meal" aria-label="Take picture of meal" onClick={openCamera}><Camera size={28} /></button>}<button type="button" aria-current={activePage === tab.key ? 'page' : undefined} onClick={() => setActivePage(tab.key)}><tab.icon size={24} strokeWidth={1.6} /><span>{tab.label}</span></button></React.Fragment>)}</nav>
    </div>
    {toast && <div className="app-toast" role="status"><span>{toast.message}</span>{toast.undo && <button type="button" onClick={() => { toast.undo?.(); setToast(null); }}>Undo</button>}</div>}
    <div inert={opening} className="app-dialog-layer">
      <OnboardingModal isOpen={isOnboardingOpen} initialProfile={userProfile} onComplete={profile => { setUserProfile(profile); setIsOnboardingOpen(false); showToast('Your daily target is set.'); }} />
      {manualMeal && <ManualMealModal meal={manualMeal} date={selectedDate} onClose={() => setManualMeal(null)} onLog={addMeal} />}
      <EditLoggedModal isOpen={!!editingItem} item={editingItem} onClose={() => setEditingItem(null)} onUpdate={(itemId, updates) => { setLoggedItems(items => items.map(item => item.id === itemId ? { ...item, ...updates } : item)); setRecipes(items => items.map(item => item.foodId === editingItem?.foodId ? { ...item, ...updates } : item)); showToast('Meal updated'); }} onDelete={deleteMeal} />
      {isAiSnapModalOpen && <section className="scanner-dialog" role="dialog" aria-modal="true" aria-label="Meal photo"><header><h2>Meal photo</h2><button type="button" className="icon-command" aria-label="Close meal photo" onClick={() => setIsAiSnapModalOpen(false)}><X size={22} /></button></header><div className="scanner-scroll"><AiMealScanner targetMeal={targetMeal} initialImage={snappedInitialImage} onChangeTargetMeal={setTargetMeal} onLogMealResult={logScan} onClose={() => setIsAiSnapModalOpen(false)} onNativeCameraPendingChange={pending => { nativeCameraPending.current = pending; }} isModal /></div></section>}
    </div>
    <input ref={directCameraInputRef} type="file" accept="image/*" capture="environment" onChange={handlePhoto} aria-label="Photograph meal" hidden />
    {opening && <OpeningSplash key={openingKey} onComplete={finishOpening} />}
  </div></div>;
}
