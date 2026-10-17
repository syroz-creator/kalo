import { FoodItem, LoggedItem, RecipeItem, UserProfile, WorkoutItem } from '../types';
import { collectPhotoRecipes } from '../utils/photoRecipes';
import { mealForStorage, queueMealPhotos } from './mealPhotoStore';
import { UserFacingError } from '../utils/userFacingError';

const PHOTO_RECIPES_KEY = 'kalo_photo_recipes_v1';

export function loadPhotoRecipes(history: LoggedItem[]): LoggedItem[] {
  try {
    const raw = localStorage.getItem(PHOTO_RECIPES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return collectPhotoRecipes(parsed);
    }
  } catch (error) { console.error('Failed to load photo recipes', error); }
  return collectPhotoRecipes(history);
}

export function savePhotoRecipes(recipes: LoggedItem[]): void {
  const previous = localStorage.getItem(PHOTO_RECIPES_KEY);
  if (previous !== null && !parseMeals(previous)) throw new UserFacingError('Recipes could not be opened. Your existing data has not been replaced. Export a backup before clearing anything.');
  queueMealPhotos(recipes);
  try { const data = JSON.stringify(recipes.map(mealForStorage)); if (data !== previous) localStorage.setItem(PHOTO_RECIPES_KEY, data); }
  catch { throw new UserFacingError('Your meals are saved, but Recipes could not be saved. Export your data before closing Kalo.'); }
}

const STORAGE_KEYS = {
  LOGGED_ITEMS: 'kalo_logged_items_v2',
  CUSTOM_FOODS: 'kalo_custom_foods_v2',
  USER_PROFILE: 'kalo_user_profile_v2',
  RECENT_FOODS: 'kalo_recent_foods_v2',
  WORKOUTS: 'kalo_workouts_v2',
  RECIPES: 'kalo_recipes_v2',
};

export const DEFAULT_PROFILE: UserProfile = {
  age: 26,
  sex: 'male',
  heightCm: 176,
  weightKg: 72,
  unitSystem: 'metric',
  activityLevel: 'moderate',
  customTargetCalories: null,
  hasCompletedOnboarding: false,
};

export const SEED_RECIPES: RecipeItem[] = [
  {
    id: 'rec-1',
    title: 'Crispy Honey Mustard Salmon Bowl',
    description: 'High-protein Atlantic salmon over warm seasoned jasmine rice with cucumber and avocado.',
    calories: 560,
    protein: 44,
    carbs: 48,
    fat: 20,
    prepTime: '20 min',
    difficulty: 'Easy',
    category: 'high_protein',
    ingredients: [
      '180g Atlantic salmon fillet',
      '130g Cooked jasmine or basmati rice',
      '1/2 Medium avocado sliced',
      '1 Persian cucumber, diced',
      '1 tbsp Dijon mustard + 1 tsp raw honey',
      '1 tsp Olive oil for searing',
    ],
    instructions: [
      'Pat salmon dry and season with sea salt, pepper, and garlic powder.',
      'Heat olive oil in a non-stick skillet over medium-high heat. Sear salmon 4-5 minutes skin-side down, then flip for 3 minutes.',
      'Whisk Dijon mustard and honey in a small bowl and brush over warm salmon.',
      'Assemble warm rice in a bowl, top with sliced cucumber, avocado, and glazed salmon.',
    ],
    tags: ['High Protein', 'Omega-3', 'Dinner'],
  },
  {
    id: 'rec-2',
    title: 'Fluffy Greek Yogurt Power Pancakes',
    description: 'Light, guilt-free pancakes packed with 36g of protein, topped with berries and maple syrup.',
    calories: 420,
    protein: 36,
    carbs: 52,
    fat: 7,
    prepTime: '15 min',
    difficulty: 'Quick',
    category: 'breakfast',
    ingredients: [
      '120g 0% Greek Yogurt',
      '50g Rolled oat flour or blended oats',
      '2 Large egg whites + 1 whole egg',
      '1 scoop (25g) Vanilla whey or plant protein',
      '1/2 tsp Baking powder & pinch of cinnamon',
      '70g Fresh blueberries for topping',
    ],
    instructions: [
      'Blend Greek yogurt, eggs, oat flour, protein powder, and baking powder until smooth.',
      'Heat a lightly greased skillet over medium-low heat.',
      'Pour 1/4 cup batter for each pancake. Cook until bubbles form on top (approx. 2 mins), flip and cook 1-2 mins.',
      'Top with fresh blueberries and light sugar-free maple syrup.',
    ],
    tags: ['Breakfast', '36g Protein', 'Meal Prep'],
  },
  {
    id: 'rec-3',
    title: 'Firecracker Ground Turkey & Rice Skillet',
    description: 'Lean 93/7 turkey tossed in sweet chili garlic soy sauce with broccoli and sesame.',
    calories: 490,
    protein: 42,
    carbs: 46,
    fat: 14,
    prepTime: '18 min',
    difficulty: 'Easy',
    category: 'dinner',
    ingredients: [
      '170g Lean ground turkey (93/7)',
      '140g Cooked white rice',
      '1 cup Steamed broccoli florets',
      '1 tbsp Low-sodium soy sauce or tamari',
      '1 tbsp Sriracha or sweet chili',
      '1 tsp Toasted sesame seeds',
    ],
    instructions: [
      'Brown ground turkey in a pan with minced garlic until fully cooked.',
      'Stir in soy sauce and chili glaze until bubbly and coated.',
      'Toss with steamed broccoli florets and serve hot over rice with toasted sesame seeds.',
    ],
    tags: ['Lean Muscle', 'Quick Prep', 'Gluten-Free'],
  },
  {
    id: 'rec-4',
    title: 'Peanut Butter Banana Overnight Oats',
    description: 'Creamy cold oats soaked with chia seeds, creamy peanut butter, and sliced ripe bananas.',
    calories: 390,
    protein: 24,
    carbs: 49,
    fat: 12,
    prepTime: '5 min',
    difficulty: 'Quick',
    category: 'snack',
    ingredients: [
      '45g Rolled oats',
      '150g Almond milk or dairy milk',
      '80g Greek yogurt',
      '1 tbsp All-natural peanut butter',
      '1/2 Medium banana sliced',
      '1 tsp Chia seeds',
    ],
    instructions: [
      'Combine oats, milk, Greek yogurt, and chia seeds in a jar or container.',
      'Swirl in peanut butter and top with banana slices.',
      'Seal and chill in the fridge overnight or for at least 4 hours.',
    ],
    tags: ['Grab & Go', 'High Fiber', 'Snack'],
  },
];

export function loadUserProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
    if (raw) {
      return { ...DEFAULT_PROFILE, ...JSON.parse(raw) };
    }
  } catch (err) {
    console.error('Failed to load user profile from storage', err);
  }
  return DEFAULT_PROFILE;
}

export function saveUserProfile(profile: UserProfile): void {
  try {
    localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
  } catch (err) {
    console.error('Failed to save user profile to storage', err);
  }
}

const HISTORY_BACKUP = 'kalo_logged_items_backup_v1';
const REMOVED_MEALS = 'kalo_removed_meals_v1';
const UNREADABLE_HISTORY = 'kalo_unreadable_meals_v1';

function parseMeals(raw: string | null): LoggedItem[] | null {
  if (raw === null) return null;
  try {
    const items: unknown = JSON.parse(raw);
    if (Array.isArray(items) && items.every(item => item && typeof item.id === 'string' && typeof item.foodId === 'string' && typeof item.name === 'string' && typeof item.date === 'string' && ['calories', 'protein', 'carbs', 'fat', 'createdAt'].every(key => typeof item[key] === 'number' && Number.isFinite(item[key])))) return items;
  } catch { /* Keep unreadable data intact so it can still be recovered. */ }
  return null;
}

export function readLoggedHistory(): { items: LoggedItem[]; recovered: boolean } {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LOGGED_ITEMS);
    const primary = parseMeals(raw);
    if (primary) return { items: primary, recovered: false };
    const backupRaw = localStorage.getItem(HISTORY_BACKUP);
    const backup = parseMeals(backupRaw);
    if (backup) return { items: backup, recovered: true };
    if (raw === null && backupRaw === null) return { items: [], recovered: false };
  } catch { throw new UserFacingError('Kalo cannot read your saved meals right now. Your existing data has not been replaced. Reopen the app and try again.'); }
  throw new UserFacingError('Your saved meals could not be opened. Your existing data has not been replaced. Export your data before clearing anything.');
}

export function loadLoggedItems(): LoggedItem[] { return readLoggedHistory().items; }

export function saveLoggedItems(items: LoggedItem[]): void {
  const previous = loadLoggedItems();
  const data = JSON.stringify(items.map(mealForStorage));
  try {
    const original = localStorage.getItem(STORAGE_KEYS.LOGGED_ITEMS);
    if (original !== null && !parseMeals(original)) localStorage.setItem(UNREADABLE_HISTORY, original);
    localStorage.setItem(STORAGE_KEYS.LOGGED_ITEMS, data);
  }
  catch { throw new UserFacingError('This change was not saved. Your previous meals are safe. Free some device storage or export your data, then try again.'); }
  queueMealPhotos(items);
  // The primary write must succeed before rotating the fallback or recording removals.
  try { localStorage.setItem(HISTORY_BACKUP, JSON.stringify(previous.map(mealForStorage))); } catch { /* The primary copy is already safely saved. */ }
  const remaining = new Set(items.map(item => item.id));
  const removed = previous.filter(item => !remaining.has(item.id));
  if (removed.length) {
    try {
      const old = parseMeals(localStorage.getItem(REMOVED_MEALS)) || [];
      const unique = new Map([...old, ...removed].map(item => [item.id, mealForStorage(item)]));
      localStorage.setItem(REMOVED_MEALS, JSON.stringify([...unique.values()].slice(-1000)));
    } catch { /* A recovery copy must not undo a successful primary save. */ }
  }
}

export function loadRecoverableMeals(history: LoggedItem[]): LoggedItem[] {
  try {
    const active = new Set(history.map(item => item.id));
    const candidates = [HISTORY_BACKUP, REMOVED_MEALS, PHOTO_RECIPES_KEY].flatMap(key => parseMeals(localStorage.getItem(key)) || []);
    return [...new Map(candidates.filter(item => !active.has(item.id)).map(item => [item.id, item])).values()].sort((a, b) => b.createdAt - a.createdAt);
  } catch { return []; }
}

export function exportSavedMealCopies() {
  const copies: Record<string, string> = {};
  for (const key of [STORAGE_KEYS.LOGGED_ITEMS, HISTORY_BACKUP, REMOVED_MEALS, UNREADABLE_HISTORY, PHOTO_RECIPES_KEY, 'kalo_water_logs_v2', 'kalo_water_ml_v1']) {
    try { const raw = localStorage.getItem(key); if (raw !== null) copies[key] = raw; }
    catch { /* Export every readable copy without including keys or credentials. */ }
  }
  return copies;
}

export function loadWorkouts(): WorkoutItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.WORKOUTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to load workouts', err);
  }
  return [];
}

export function saveWorkouts(workouts: WorkoutItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.WORKOUTS, JSON.stringify(workouts));
  } catch (err) {
    console.error('Failed to save workouts', err);
  }
}

export function loadRecipes(): RecipeItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.RECIPES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to load recipes', err);
  }
  return SEED_RECIPES;
}

export function saveRecipes(recipes: RecipeItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.RECIPES, JSON.stringify(recipes));
  } catch (err) {
    console.error('Failed to save recipes', err);
  }
}

function parseWaterLogs(raw: string | null, multiplier = 1): Record<string, number> | null {
  if (raw === null) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const entries = Object.entries(value);
    if (!entries.every(([date, amount]) => /^\d{4}-\d{2}-\d{2}$/.test(date) && typeof amount === 'number' && Number.isFinite(amount) && amount >= 0 && Number.isFinite(amount * multiplier))) return null;
    return Object.fromEntries(entries.map(([date, amount]) => [date, amount * multiplier]));
  } catch { return null; }
}

// The older log stored 250 ml cups. Preserve volumes when switching to eight slots.
export function loadWaterLogs(): Record<string, number> {
  try {
    return parseWaterLogs(localStorage.getItem('kalo_water_ml_v1'))
      ?? parseWaterLogs(localStorage.getItem('kalo_water_logs_v2'), 250)
      ?? {};
  } catch (err) {
    console.error('Failed to load water logs', err);
  }
  return {};
}

export function saveWaterLogs(logs: Record<string, number>): void {
  try {
    const original = localStorage.getItem('kalo_water_ml_v1');
    if (original !== null && !parseWaterLogs(original)) throw new Error('Unreadable water log');
    const data = JSON.stringify(logs);
    if (!parseWaterLogs(data)) throw new Error('Invalid water log');
    localStorage.setItem('kalo_water_ml_v1', data);
  } catch {
    throw new UserFacingError('Your water could not be saved. Please try again.');
  }
}
