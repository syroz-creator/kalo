import type { AnalyzedFoodItem, Nutrition } from '../types';

export function foodPortion(food: AnalyzedFoodItem) {
  if (food.portionQuantity && food.portionUnit) return { amount: food.portionQuantity, unit: food.portionUnit };
  const weight = food.portion.trim().match(/^(\d+(?:\.\d+)?)\s*(g|grams?|ml)$/i);
  if (weight && Number(weight[1]) > 0) return { amount: Number(weight[1]), unit: (weight[2].toLowerCase() === 'ml' ? 'ml' : 'g') as 'g' | 'ml' };
  const pieces = food.portion.trim().match(/^(\d+(?:\.\d+)?)\s+(?:biscuits?|cookies?|pieces?|bars?|slices?|crackers?|eggs?)(?:\s*\(.*\))?$/i);
  if (pieces && Number(pieces[1]) > 0) return { amount: Number(pieces[1]), unit: 'piece' as const };
  return { amount: 1, unit: 'serving' as const };
}

export function resizeFoodPortion(food: AnalyzedFoodItem, amount: number): AnalyzedFoodItem {
  const base = foodPortion(food);
  const safe = Number.isFinite(amount) && amount >= 0 ? amount : 0;
  const ratio = safe / base.amount;
  return { ...food, portionQuantity: safe, portionUnit: base.unit, portion: `${safe} ${base.unit === 'piece' ? (safe === 1 ? 'piece' : 'pieces') : base.unit === 'serving' ? (safe === 1 ? 'serving' : 'servings') : base.unit}`,
    calories: Math.round(food.calories * ratio), protein: Math.round(food.protein * ratio * 10) / 10,
    carbs: Math.round(food.carbs * ratio * 10) / 10, fat: Math.round(food.fat * ratio * 10) / 10 };
}

export function totalFoodNutrition(items: AnalyzedFoodItem[]): Nutrition {
  const sum = (field: keyof Nutrition) => items.reduce((value, item) => value + item[field], 0);
  return { calories: Math.round(sum('calories')), protein: Math.round(sum('protein') * 10) / 10, carbs: Math.round(sum('carbs') * 10) / 10, fat: Math.round(sum('fat') * 10) / 10 };
}
