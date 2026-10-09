import React, { useState, useEffect, useRef } from 'react';
import {
  Calendar as CalendarIcon,
  TrendingUp,
  Camera,
  UtensilsCrossed,
  SlidersHorizontal,
  Plus,
} from 'lucide-react';
import { Logo } from './components/Logo';
import {
  LoggedItem,
  MealType,
  RecipeItem,
  UserProfile,
  WorkoutItem,
} from './types';
import {
  loadLoggedItems,
  loadRecipes,
  loadUserProfile,
  loadWaterLogs,
  loadWorkouts,
  saveLoggedItems,
  saveRecipes,
  saveUserProfile,
  saveWaterLogs,
  saveWorkouts,
} from './services/storage';
import { calculateEnergyNeeds } from './utils/calculator';
import { getTodayKey } from './utils/date';
import { TodayTab } from './components/TodayTab';
import { ProgressTab } from './components/ProgressTab';
import { RecipesTab } from './components/RecipesTab';
import { SettingsTab } from './components/SettingsTab';
import { AiMealScanner } from './components/AiMealScanner';
import { EditLoggedModal } from './components/EditLoggedModal';
import { OnboardingModal } from './components/OnboardingModal';

type ActivePage = 'today' | 'progress' | 'recipes' | 'settings';

export default function App() {
  // Navigation
  const [activePage, setActivePage] = useState<ActivePage>('today');
  const [selectedDate, setSelectedDate] = useState<string>(getTodayKey());

  // Persistent State
  const [userProfile, setUserProfile] = useState<UserProfile>(loadUserProfile);
  const [loggedItems, setLoggedItems] = useState<LoggedItem[]>(loadLoggedItems);
  const [workouts, setWorkouts] = useState<WorkoutItem[]>(loadWorkouts);
  const [recipes, setRecipes] = useState<RecipeItem[]>(loadRecipes);
  const [waterLogs, setWaterLogs] = useState<Record<string, number>>(loadWaterLogs);

  // Opening Onboarding Modal
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(() => {
    return !userProfile.hasCompletedOnboarding;
  });

  // Camera Snap AI Modal
  const [isAiSnapModalOpen, setIsAiSnapModalOpen] = useState(false);
  const [targetMeal, setTargetMeal] = useState<MealType>('breakfast');
  const [snappedInitialImage, setSnappedInitialImage] = useState<string | null>(null);
  const directCameraInputRef = useRef<HTMLInputElement>(null);

  const handleDirectPhotoCaptured = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setSnappedInitialImage(dataUrl);
      setIsAiSnapModalOpen(true);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Edit Logged Item Modal
  const [editingItem, setEditingItem] = useState<LoggedItem | null>(null);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  // Sync to Storage
  useEffect(() => {
    saveUserProfile(userProfile);
  }, [userProfile]);

  useEffect(() => {
    saveLoggedItems(loggedItems);
  }, [loggedItems]);

  useEffect(() => {
    saveWorkouts(workouts);
  }, [workouts]);

  useEffect(() => {
    saveRecipes(recipes);
  }, [recipes]);

  useEffect(() => {
    saveWaterLogs(waterLogs);
  }, [waterLogs]);

  const handleUpdateWaterCups = (cups: number) => {
    setWaterLogs((prev) => ({
      ...prev,
      [selectedDate]: Math.max(0, Math.min(8, cups)),
    }));
  };

  // Derived Energy Needs
  const energyNeeds = calculateEnergyNeeds(userProfile);

  // Handlers for Logging Meals
  const handleOpenSnapForMeal = (meal: MealType) => {
    setTargetMeal(meal);
    setSnappedInitialImage(null);
    if (directCameraInputRef.current) {
      directCameraInputRef.current.click();
    } else {
      setIsAiSnapModalOpen(true);
    }
  };

  const handleOpenGlobalCamera = () => {
    // Guess default meal based on current hour
    const hour = new Date().getHours();
    let guessedMeal: MealType = 'lunch';
    if (hour < 11) guessedMeal = 'breakfast';
    else if (hour < 16) guessedMeal = 'lunch';
    else if (hour < 21) guessedMeal = 'dinner';
    else guessedMeal = 'snacks';

    setTargetMeal(guessedMeal);
    setSnappedInitialImage(null);
    if (directCameraInputRef.current) {
      directCameraInputRef.current.click();
    } else {
      setIsAiSnapModalOpen(true);
    }
  };

  const handleLogAiMeal = (result: {
    meal: MealType;
    dishName: string;
    totalCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFat: number;
    portionDescription: string;
    imageUrl?: string;
  }) => {
    const newItem: LoggedItem = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      foodId: `ai-${Date.now()}`,
      date: selectedDate,
      meal: result.meal,
      name: result.dishName,
      quantity: 1,
      unit: result.portionDescription || 'portion',
      calories: result.totalCalories,
      protein: result.totalProtein,
      carbs: result.totalCarbs,
      fat: result.totalFat,
      source: 'ai_camera',
      imageUrl: result.imageUrl,
      createdAt: Date.now(),
    };

    setLoggedItems((prev) => [newItem, ...prev]);
    showToast(`Logged ${result.totalCalories} kcal to ${result.meal}!`);
    setIsAiSnapModalOpen(false);
    setActivePage('today');
  };

  const handleLogRecipe = (recipe: RecipeItem, meal: MealType) => {
    const newItem: LoggedItem = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      foodId: recipe.id,
      date: selectedDate,
      meal,
      name: recipe.title,
      quantity: 1,
      unit: 'serving',
      calories: recipe.calories,
      protein: recipe.protein,
      carbs: recipe.carbs,
      fat: recipe.fat,
      source: 'custom',
      createdAt: Date.now(),
    };

    setLoggedItems((prev) => [newItem, ...prev]);
    showToast(`Logged ${recipe.title} to ${meal}!`);
    setActivePage('today');
  };

  const handleUpdateLoggedItem = (id: string, updates: Partial<LoggedItem>) => {
    setLoggedItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
    showToast('Updated meal item');
  };

  const handleDeleteLoggedItem = (id: string) => {
    setLoggedItems((prev) => prev.filter((item) => item.id !== id));
    showToast('Removed item');
  };

  // Workout Handlers
  const handleAddWorkout = (workout: Omit<WorkoutItem, 'id' | 'createdAt'>) => {
    const newWorkout: WorkoutItem = {
      ...workout,
      id: `w-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: Date.now(),
    };
    setWorkouts((prev) => [newWorkout, ...prev]);
    showToast(`Workout logged (-${workout.caloriesBurned} kcal)`);
  };

  const handleDeleteWorkout = (id: string) => {
    setWorkouts((prev) => prev.filter((w) => w.id !== id));
    showToast('Removed workout');
  };

  // Clear data
  const handleClearAllData = () => {
    setLoggedItems([]);
    setWorkouts([]);
    showToast('All log data cleared');
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-0 sm:p-4 text-white antialiased selection:bg-yellow-400 selection:text-black">
      {/* Mobile Shell Container (Fixed 390px iPhone baseline on desktop, 100% on mobile) */}
      <div className="w-full sm:max-w-[400px] h-[100dvh] sm:h-[844px] bg-[#0E0E10] sm:rounded-[44px] sm:shadow-2xl sm:shadow-yellow-400/5 sm:border-2 sm:border-[#27272A] flex flex-col overflow-hidden relative">
        {/* App Top Bar */}
        <header className="px-5 pt-3.5 pb-3 flex items-center justify-between border-b border-zinc-800/80 bg-[#121214]/90 backdrop-blur-md sticky top-0 z-20">
          <Logo size="md" showSubtitle={true} />

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenGlobalCamera}
              className="h-8 px-3 rounded-xl bg-yellow-400 hover:bg-yellow-300 active:scale-95 text-black text-xs font-black flex items-center gap-1.5 transition-all shadow-md shadow-yellow-400/20"
              aria-label="Snap meal photo"
            >
              <Camera className="w-3.5 h-3.5 text-black" />
              <span>Snap</span>
            </button>
          </div>
        </header>

        {/* Hidden Global Native Camera Input */}
        <input
          ref={directCameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleDirectPhotoCaptured}
          className="hidden"
        />

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden bg-[#0E0E10]">
          {activePage === 'today' && (
            <TodayTab
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              loggedItems={loggedItems}
              energyNeeds={energyNeeds}
              cupsDrank={waterLogs[selectedDate] ?? 0}
              onUpdateWaterCups={handleUpdateWaterCups}
              onOpenLogModal={handleOpenSnapForMeal}
              onEditItem={(item) => setEditingItem(item)}
              onQuickSnap={handleOpenGlobalCamera}
            />
          )}

          {activePage === 'progress' && (
            <ProgressTab
              selectedDate={selectedDate}
              loggedItems={loggedItems}
              workouts={workouts}
              targetCalories={energyNeeds.tdee}
              onAddWorkout={handleAddWorkout}
              onDeleteWorkout={handleDeleteWorkout}
            />
          )}

          {activePage === 'recipes' && (
            <RecipesTab
              recipes={recipes}
              onLogRecipeAsMeal={handleLogRecipe}
            />
          )}

          {activePage === 'settings' && (
            <SettingsTab
              profile={userProfile}
              onSaveProfile={setUserProfile}
              onOpenOnboarding={() => setIsOnboardingOpen(true)}
              onClearAllData={handleClearAllData}
            />
          )}
        </main>

        {/* Bottom Tab Bar with Center Camera Snap Button */}
        <nav className="h-18 border-t border-zinc-800 bg-[#121214]/95 backdrop-blur-md px-3 grid grid-cols-5 items-center z-20">
          {/* 1. Today */}
          <button
            type="button"
            onClick={() => setActivePage('today')}
            className={`flex flex-col items-center justify-center py-1 transition-all ${
              activePage === 'today'
                ? 'text-yellow-400 font-black'
                : 'text-zinc-500 hover:text-zinc-300 font-semibold'
            }`}
          >
            <CalendarIcon className="w-5 h-5" />
            <span className="text-[10px] mt-1">Today</span>
          </button>

          {/* 2. Progress */}
          <button
            type="button"
            onClick={() => setActivePage('progress')}
            className={`flex flex-col items-center justify-center py-1 transition-all ${
              activePage === 'progress'
                ? 'text-yellow-400 font-black'
                : 'text-zinc-500 hover:text-zinc-300 font-semibold'
            }`}
          >
            <TrendingUp className="w-5 h-5" />
            <span className="text-[10px] mt-1">Progress</span>
          </button>

          {/* 3. Center Camera Action Shutter Button */}
          <div className="flex items-center justify-center -mt-6 relative">
            {/* Glowing yellow ambient pulse */}
            <div className="absolute inset-0 rounded-full bg-yellow-400/25 blur-lg animate-pulse-glow pointer-events-none scale-125" />
            <button
              type="button"
              onClick={handleOpenGlobalCamera}
              className="w-14 h-14 rounded-full bg-gradient-to-tr from-amber-500 via-yellow-400 to-yellow-300 hover:brightness-110 active:scale-95 text-black flex items-center justify-center shadow-2xl shadow-yellow-400/50 border-4 border-[#0E0E10] transition-all relative z-10 animate-float-bob"
              aria-label="Take picture of meal"
              title="Snap & analyze meal"
            >
              <Camera className="w-6 h-6 stroke-[2.5]" />
            </button>
          </div>

          {/* 4. Recipes */}
          <button
            type="button"
            onClick={() => setActivePage('recipes')}
            className={`flex flex-col items-center justify-center py-1 transition-all ${
              activePage === 'recipes'
                ? 'text-yellow-400 font-black'
                : 'text-zinc-500 hover:text-zinc-300 font-semibold'
            }`}
          >
            <UtensilsCrossed className="w-5 h-5" />
            <span className="text-[10px] mt-1">Recipes</span>
          </button>

          {/* 5. Settings */}
          <button
            type="button"
            onClick={() => setActivePage('settings')}
            className={`flex flex-col items-center justify-center py-1 transition-all ${
              activePage === 'settings'
                ? 'text-yellow-400 font-black'
                : 'text-zinc-500 hover:text-zinc-300 font-semibold'
            }`}
          >
            <SlidersHorizontal className="w-5 h-5" />
            <span className="text-[10px] mt-1">Settings</span>
          </button>
        </nav>

        {/* Toast Notification */}
        {toastMessage && (
          <div className="absolute bottom-22 left-1/2 -translate-x-1/2 bg-yellow-400 text-black text-xs font-black px-4 py-2.5 rounded-full shadow-2xl z-50 border-2 border-black/40 animate-pop-bounce flex items-center gap-1.5 shadow-yellow-400/30">
            <span className="w-2 h-2 rounded-full bg-black animate-ping" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Onboarding Opening Modal */}
        <OnboardingModal
          isOpen={isOnboardingOpen}
          initialProfile={userProfile}
          onComplete={(newProfile) => {
            setUserProfile(newProfile);
            setIsOnboardingOpen(false);
            showToast('Calorie baseline calibrated!');
          }}
        />

        {/* Edit Logged Item Modal */}
        <EditLoggedModal
          isOpen={!!editingItem}
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onUpdate={handleUpdateLoggedItem}
          onDelete={handleDeleteLoggedItem}
        />

        {/* AI Meal Snap Modal */}
        {isAiSnapModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-2">
            <div
              className="w-full max-w-[420px] max-h-[92vh] bg-[#141416] rounded-t-3xl sm:rounded-3xl flex flex-col shadow-2xl border-2 border-yellow-400/60 overflow-hidden animate-pop-bounce"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-5 pt-3.5 pb-3 border-b border-zinc-800 flex items-center justify-between bg-[#18181B]">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-yellow-400 text-black flex items-center justify-center">
                    <Camera className="w-4 h-4" />
                  </div>
                  <h2 className="text-sm font-black text-white">
                    Snap & Count {targetMeal.toUpperCase()}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAiSnapModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white flex items-center justify-center font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar">
                <AiMealScanner
                  targetMeal={targetMeal}
                  initialImage={snappedInitialImage}
                  onChangeTargetMeal={setTargetMeal}
                  onLogMealResult={handleLogAiMeal}
                  onClose={() => setIsAiSnapModalOpen(false)}
                  isModal
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
