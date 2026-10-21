import { VERIFIED_FOODS } from '../data/verifiedFoods';
import type { AnalyzedFoodItem } from '../types';
import { totalFoodNutrition } from '../utils/mealPortions';
import { proSubscription } from './proSubscription';

export type MealImprovementGoal = 'balance' | 'energy';
export interface MealPreferences { plantBased: boolean; noDairy: boolean; noNuts: boolean; }
export interface MealSuggestion {
  id: string;
  name: string;
  reason: string;
  food: AnalyzedFoodItem;
}
interface Addition { id: string; name: string; grams: number; group: 'produce' | 'protein' | 'grain' | 'fat'; reason: string; tags?: ('dairy' | 'nuts' | 'animal')[]; matches: RegExp; sweet?: boolean; }
const additions: Addition[] = [
  { id: 'vf-broccoli', name: 'Cooked broccoli', grams: 100, group: 'produce', reason: 'Add vegetables and fiber alongside your meal.', matches: /broccoli|بروكلي|ברוקולי/ },
  { id: 'vf-spinach-raw', name: 'Baby spinach', grams: 30, group: 'produce', reason: 'Add leafy greens for more variety.', matches: /spinach|سبانخ|תרד/ },
  { id: 'vf-blueberries', name: 'Blueberries', grams: 75, group: 'produce', reason: 'Add fruit and fiber to your bowl or on the side.', matches: /blueberr|توت|אוכמני/, sweet: true },
  { id: 'vf-banana', name: 'Banana', grams: 118, group: 'produce', reason: 'Add a simple source of carbohydrates and energy.', matches: /banana|موز|בננ/, sweet: true },
  { id: 'vf-tofu-firm', name: 'Firm tofu', grams: 100, group: 'protein', reason: 'Add plant protein to round out your meal.', matches: /tofu|توفو|טופו/ },
  { id: 'vf-black-beans-cooked', name: 'Cooked black beans', grams: 100, group: 'protein', reason: 'Add plant protein and fiber.', matches: /bean|فاصوليا|שעועית/ },
  { id: 'vf-greek-yogurt-0', name: 'Plain Greek yogurt', grams: 170, group: 'protein', reason: 'Add a side of plain yogurt for extra protein.', tags: ['dairy', 'animal'], matches: /yog[hu]rt|لبن|زبادي|יוגורט/, sweet: true },
  { id: 'vf-rolled-oats', name: 'Rolled oats (dry)', grams: 40, group: 'grain', reason: 'Add whole grains and a more substantial portion.', matches: /oat|شوفان|שיבולת/, sweet: true },
  { id: 'vf-brown-rice-cooked', name: 'Cooked brown rice', grams: 150, group: 'grain', reason: 'Add a whole-grain side for more energy.', matches: /brown rice|رز بني|أرز بني|אורז מלא/ },
  { id: 'vf-avocado', name: 'Avocado', grams: 75, group: 'fat', reason: 'Add energy and unsaturated fats.', matches: /avocado|أفوكادو|افوكادو|אבוקדו/ },
  { id: 'vf-almonds', name: 'Almonds', grams: 28, group: 'fat', reason: 'Add a small serving of nuts for more energy.', tags: ['nuts'], matches: /almond|لوز|שקדי/, sweet: true },
  { id: 'vf-peanut-butter', name: 'Natural peanut butter', grams: 32, group: 'fat', reason: 'Add a calorie-dense topping with plant protein.', tags: ['nuts'], matches: /peanut|فول سوداني|בוטני/, sweet: true },
];

// Uses the same reference foods as manual logging. The photo identifies the
// current meal; additions use known portions, never invented photo measurements.
export function buildMealSuggestions(items: AnalyzedFoodItem[], goal: MealImprovementGoal, preferences: MealPreferences): MealSuggestion[] {
  const active = items.filter(item => item.portionQuantity !== 0 && Number.isFinite(item.calories) && item.calories >= 0);
  if (!active.length) return [];
  const names = active.map(item => item.name.toLowerCase()).join(' ');
  const sweet = /oat|yog[hu]rt|smoothie|cereal|pancake|porridge|fruit|شوفان|لبن|زبادي|بان كيك|פנקייק|יוגורט|שיבולת|דייסה/.test(names)
    && !/chicken|beef|fish|salmon|tuna|دجاج|لحمة|سمك|עוף|בקר|דג/.test(names);
  const totals = totalFoodNutrition(active);
  const proteinShare = totals.calories > 0 ? totals.protein * 4 / totals.calories : 0;
  const desired = goal === 'energy' ? ['fat', 'grain', 'protein', 'produce']
    : proteinShare < .15 ? ['protein', 'produce', 'grain', 'fat'] : ['produce', 'grain', 'protein', 'fat'];
  const candidates = additions.filter(addition => !addition.matches.test(names)
    && !(preferences.plantBased && addition.tags?.includes('animal'))
    && !(preferences.noDairy && addition.tags?.includes('dairy'))
    && !(preferences.noNuts && addition.tags?.includes('nuts'))
    && (sweet ? addition.sweet || addition.id === 'vf-avocado' : !addition.sweet));
  const selected: Addition[] = [];
  for (const group of desired) {
    const candidate = candidates.find(addition => addition.group === group && !selected.includes(addition));
    if (candidate) selected.push(candidate);
    if (selected.length === 3) break;
  }
  return selected.map(addition => {
    const reference = VERIFIED_FOODS.find(food => food.id === addition.id)!;
    const scale = addition.grams / reference.servingSize;
    const round = (value: number) => Math.round(value * scale * 10) / 10;
    return {
      id: addition.id, name: addition.name, reason: addition.reason,
      food: { name: addition.name, portion: `${addition.grams} g`, portionQuantity: addition.grams, portionUnit: 'g',
        calories: Math.round(reference.calories * scale), protein: round(reference.protein), carbs: round(reference.carbs), fat: round(reference.fat) },
    };
  });
}

export async function getMealSuggestions(items: AnalyzedFoodItem[], goal: MealImprovementGoal, preferences: MealPreferences) {
  await proSubscription.requireActive();
  return buildMealSuggestions(items, goal, preferences);
}
