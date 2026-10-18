import type { AnalyzedFoodItem, FoodItem, LoggedItem, RecipeItem, UserProfile, WorkoutItem } from '../types';
import { loadBodyPhotos, mergeBodyPhotos } from './bodyProgress';
import { archiveMealPhotos, compactMeal, hydrateMealPhotos } from './mealPhotoStore';
import { exportSavedMealCopies, loadLoggedItems, loadPhotoRecipes, loadRecoverableMeals, loadUserProfile, loadWaterLogs, loadWorkouts } from './storage';
import { validBodyPhoto, validProgressDate } from '../utils/bodyProgress';
import { UserFacingError } from '../utils/userFacingError';

export const maxBackupBytes = 100 * 1024 * 1024;
const invalid = () => new UserFacingError('This is not a valid Kalo backup. No data has been changed.');
const record = (v: unknown): v is Record<string, any> => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === 'string' && v.length <= 10000;
const number = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const nutrition = (v: Record<string, unknown>) => ['calories', 'protein', 'carbs', 'fat'].every(k => number(v[k]));
const sources = ['verified', 'openfoodfacts', 'custom', 'ai_camera', 'ai_text'];
const image = (v: unknown) => typeof v === 'string' && v.length <= maxBackupBytes && /^data:image\/(?:jpeg|png|webp|heic|heif);base64,[A-Za-z0-9+/]+={0,2}$/.test(v);
const optional = (v: unknown, check: (value: any) => boolean) => v === undefined || check(v);
const date = (v: unknown): v is string => typeof v === 'string' && validProgressDate(v);

function ingredient(v: unknown): v is AnalyzedFoodItem {
  return record(v) && text(v.name) && text(v.portion) && nutrition(v)
    && optional(v.portionQuantity, number) && optional(v.portionUnit, u => ['g', 'ml', 'piece', 'serving'].includes(u))
    && optional(v.gramsPerPiece, number);
}
function meal(v: unknown): v is LoggedItem {
  if (!record(v)) return false;
  return text(v.id) && !!v.id && text(v.foodId) && !!v.foodId && text(v.name) && date(v.date)
    && ['breakfast', 'lunch', 'dinner', 'snacks'].includes(v.meal) && nutrition(v) && number(v.createdAt)
    && number(v.quantity) && text(v.unit) && sources.includes(v.source)
    && optional(v.brand, text) && optional(v.photoId, text)
    && optional(v.estimateNotes, text)
    && optional(v.imageUrl, u => image(u) || (typeof u === 'string' && /^https:\/\//.test(u) && u.length < 4000))
    && optional(v.ingredients, a => Array.isArray(a) && a.every(ingredient))
    && optional(v.productPortion, p => record(p) && record(p.product) && text(p.product.barcode) && text(p.product.name)
      && ['g', 'ml'].includes(p.product.unit) && record(p.product.nutritionPer100) && nutrition(p.product.nutritionPer100)
      && number(p.amount) && ['weight', 'servings', 'pieces'].includes(p.mode)
      && ['servingQuantity', 'pieceQuantity'].every(k => optional(p.product[k], n => number(n) && n > 0))
      && optional(p.pieceWeight, n => number(n) && n > 0));
}
function profile(v: unknown): v is UserProfile {
  return record(v) && number(v.age) && v.age >= 1 && v.age <= 120 && ['male', 'female'].includes(v.sex)
    && number(v.heightCm) && v.heightCm > 0 && v.heightCm <= 300 && number(v.weightKg) && v.weightKg > 0 && v.weightKg <= 1000
    && ['metric', 'imperial'].includes(v.unitSystem) && ['sedentary', 'light', 'moderate', 'very_active'].includes(v.activityLevel)
    && optional(v.goal, g => ['lose', 'maintain', 'gain'].includes(g)) && optional(v.weeklyWeightChangeKg, number)
    && optional(v.customTargetCalories, n => n === null || (number(n) && n > 0 && n <= 20000))
    && optional(v.hasCompletedOnboarding, b => typeof b === 'boolean');
}
function workout(v: unknown): v is WorkoutItem {
  return record(v) && text(v.id) && !!v.id && date(v.date) && text(v.title)
    && ['strength', 'cardio', 'walk', 'hiit', 'sport'].includes(v.type)
    && number(v.durationMinutes) && number(v.caloriesBurned) && number(v.createdAt) && optional(v.notes, text);
}
function food(v: unknown): v is FoodItem {
  return record(v) && text(v.id) && text(v.name) && number(v.servingSize) && v.servingSize > 0
    && text(v.servingUnit) && sources.includes(v.source) && nutrition(v) && optional(v.brand, text) && optional(v.gramWeight, number);
}
function recipe(v: unknown): v is RecipeItem {
  return record(v) && text(v.id) && text(v.title) && text(v.description) && nutrition(v) && text(v.prepTime)
    && ['Easy', 'Medium', 'Quick'].includes(v.difficulty) && ['high_protein', 'breakfast', 'dinner', 'snack'].includes(v.category)
    && ['ingredients', 'instructions', 'tags'].every(k => Array.isArray(v[k]) && v[k].every(text));
}
function list<T>(v: unknown, check: (v: unknown) => v is T): T[] {
  if (!Array.isArray(v) || v.length > 100000 || !v.every(check)) throw invalid();
  return v;
}
function unique<T>(items: T[], key: (v: T) => string) {
  if (new Set(items.map(key)).size !== items.length) throw invalid();
  return items;
}

export function parseBackup(raw: string) {
  if (raw.length > maxBackupBytes) throw invalid();
  let v: unknown;
  try { v = JSON.parse(raw); } catch { throw invalid(); }
  return validateBackup(v);
}
function validateBackup(v: unknown) {
  if (!record(v) || (v.format !== undefined && v.format !== 'kalo-backup') || (v.version !== undefined && v.version !== 1)
    || !profile(v.profile) || !record(v.water) || (v.waterUnit !== undefined && v.waterUnit !== 'ml')) throw invalid();
  const water = Object.fromEntries(Object.entries(v.water).map(([key, amount]) => {
    // Older Kalo exports stored water as 250 ml cups.
    if (!date(key) || !number(amount) || !Number.isFinite(amount * 250)) throw invalid();
    return [key, amount * (v.waterUnit === 'ml' ? 1 : 250)];
  }));
  return {
    format: 'kalo-backup' as const, version: 1 as const,
    createdAt: text(v.createdAt) ? v.createdAt : undefined,
    profile: v.profile,
    meals: unique(list(v.meals, meal), m => m.id),
    recipes: unique(list(v.recipes, meal), m => m.id),
    workouts: unique(list(v.workouts, workout), w => w.id),
    water, waterUnit: 'ml' as const,
    bodyProgress: unique(list(v.bodyProgress ?? [], validBodyPhoto), p => p.date),
    recoverableMeals: unique(list(v.recoverableMeals ?? [], meal), m => m.id),
    customFoods: unique(list(v.customFoods ?? [], food), f => f.id),
    foodRecipes: unique(list(v.foodRecipes ?? [], recipe), r => r.id),
  };
}
export type KaloBackup = ReturnType<typeof parseBackup>;

function savedList<T>(key: string, check: (v: unknown) => v is T): T[] {
  const raw = localStorage.getItem(key);
  return raw === null ? [] : list(JSON.parse(raw), check);
}
const merge = <T>(current: T[], incoming: T[], key: (v: T) => string) => {
  const known = new Set(current.map(key));
  return [...current, ...incoming.filter(item => !known.has(key(item)))];
};

async function completePhotos(items: LoggedItem[]) {
  const hydrated = await hydrateMealPhotos(items);
  if (hydrated.some(m => m.photoId && !m.imageUrl)) throw new UserFacingError('Some meal photos could not be included. Your backup was not downloaded. Please try again.');
  return hydrated;
}
function currentWater() {
  const raw = localStorage.getItem('kalo_water_ml_v1') ?? localStorage.getItem('kalo_water_logs_v2');
  if (raw !== null) {
    const values: unknown = JSON.parse(raw);
    if (!record(values) || !Object.entries(values).every(([d, amount]) => date(d) && number(amount))) throw invalid();
  }
  return loadWaterLogs();
}
export async function createBackup(): Promise<KaloBackup & { savedMealCopies: Record<string, string> }> {
  const meals = loadLoggedItems();
  const data = {
    format: 'kalo-backup', version: 1, createdAt: new Date().toISOString(), profile: loadUserProfile(),
    meals: await completePhotos(meals), recipes: await completePhotos(localStorage.getItem('kalo_photo_recipes_v1') === null ? loadPhotoRecipes(meals) : savedList('kalo_photo_recipes_v1', meal)), workouts: savedList('kalo_workouts_v2', workout),
    recoverableMeals: await completePhotos(loadRecoverableMeals(meals)),
    water: currentWater(), waterUnit: 'ml', bodyProgress: await loadBodyPhotos(),
    customFoods: savedList('kalo_custom_foods_v2', food), foodRecipes: savedList('kalo_recipes_v2', recipe),
    savedMealCopies: exportSavedMealCopies(),
  };
  return { ...validateBackup(data), savedMealCopies: data.savedMealCopies };
}

export async function restoreBackup(backup: KaloBackup, restoreProfile: boolean) {
  // Validate again at the write boundary, not just when the file is selected.
  const incoming = validateBackup(backup);
  const current = loadLoggedItems();
  const recipes = localStorage.getItem('kalo_photo_recipes_v1') === null ? loadPhotoRecipes(current) : savedList('kalo_photo_recipes_v1', meal);
  savedList('kalo_removed_meals_v1', meal);
  const recovered = loadRecoverableMeals(current);
  const added = (base: LoggedItem[], values: LoggedItem[]) => {
    const ids = new Set(base.map(m => m.id));
    return values.filter(m => !ids.has(m.id)).map(m => {
      const { photoId: _old, ...copy } = m;
      if (m.photoId && !m.imageUrl) throw new UserFacingError('This backup is missing meal photos. No records have been restored.');
      return m.imageUrl?.startsWith('data:') ? { ...copy, photoId: `restore-${crypto.randomUUID()}` } : copy;
    });
  };
  const newMeals = added(current, incoming.meals), newRecipes = added(recipes, incoming.recipes), newRecovered = added(recovered, incoming.recoverableMeals);
  const water = currentWater();
  const nextWater = Object.fromEntries([...new Set([...Object.keys(water), ...Object.keys(incoming.water)])].map(d => [d, Math.max(water[d] ?? 0, incoming.water[d] ?? 0)]));
  const writes = new Map<string, string>([
    ['kalo_logged_items_v2', JSON.stringify([...current, ...newMeals].map(compactMeal))],
    ['kalo_photo_recipes_v1', JSON.stringify([...recipes, ...newRecipes].map(compactMeal))],
    ['kalo_removed_meals_v1', JSON.stringify([...recovered, ...newRecovered].map(compactMeal))],
    ['kalo_workouts_v2', JSON.stringify(merge(savedList('kalo_workouts_v2', workout), incoming.workouts, w => w.id))],
    ['kalo_water_ml_v1', JSON.stringify(nextWater)],
    ['kalo_custom_foods_v2', JSON.stringify(merge(savedList('kalo_custom_foods_v2', food), incoming.customFoods, f => f.id))],
    ['kalo_recipes_v2', JSON.stringify(merge(savedList('kalo_recipes_v2', recipe), incoming.foodRecipes, r => r.id))],
  ]);
  const originalHistory = localStorage.getItem('kalo_logged_items_v2');
  if (originalHistory !== null) {
    try { list(JSON.parse(originalHistory), meal); }
    catch { writes.set('kalo_unreadable_meals_v1', originalHistory); }
  }
  if (restoreProfile) writes.set('kalo_user_profile_v2', JSON.stringify(incoming.profile));
  const before = new Map([...writes.keys()].map(key => [key, localStorage.getItem(key)]));
  try {
    // Archive both existing inline photos and imports before compacting any metadata.
    await archiveMealPhotos([...current, ...recipes, ...recovered, ...newMeals, ...newRecipes, ...newRecovered]);
    await mergeBodyPhotos(incoming.bodyProgress, () => {
      const changed: string[] = [];
      const rollback = () => { for (const key of [...changed].reverse()) { const value = before.get(key); if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value!); } };
      try {
        if ([...before].some(([key, value]) => localStorage.getItem(key) !== value)) throw new Error('Records changed during restore');
        for (const [key, value] of writes) { localStorage.setItem(key, value); changed.push(key); }
      } catch (failure) {
        rollback();
        throw failure;
      }
      return rollback;
    });
  } catch { throw new UserFacingError('The backup could not be restored. Your existing records have been kept. Free some storage and try again.'); }
  return { meals: loadLoggedItems(), recipes: loadPhotoRecipes(loadLoggedItems()), workouts: loadWorkouts(), water: loadWaterLogs(), profile: loadUserProfile() };
}
