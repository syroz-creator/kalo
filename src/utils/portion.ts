import { FoodItem } from '../types';

export interface PortionCalculation {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  displayQuantity: number;
  displayUnit: string;
}

export function calculatePortionNutrition(
  food: FoodItem,
  amount: number,
  mode: 'grams' | 'servings'
): PortionCalculation {
  const safeAmount = Math.max(0, isNaN(amount) ? 0 : amount);

  let multiplier = 0;
  let displayQuantity = safeAmount;
  let displayUnit = 'g';

  if (food.servingUnit === 'g' || food.servingUnit === 'ml') {
    if (mode === 'grams') {
      multiplier = safeAmount / food.servingSize;
      displayQuantity = safeAmount;
      displayUnit = food.servingUnit;
    } else {
      // mode === 'servings'
      const pieceWeight = food.gramWeight || 100;
      const totalGrams = safeAmount * pieceWeight;
      multiplier = totalGrams / food.servingSize;
      displayQuantity = safeAmount;
      displayUnit = safeAmount === 1 ? 'serving' : 'servings';
    }
  } else {
    // Food is defined per serving/piece/slice/bar
    if (mode === 'servings') {
      multiplier = safeAmount / food.servingSize;
      displayQuantity = safeAmount;
      displayUnit = safeAmount === 1 ? food.servingUnit : `${food.servingUnit}s`;
    } else {
      // mode === 'grams'
      const pieceWeight = food.gramWeight || 100;
      multiplier = safeAmount / pieceWeight;
      displayQuantity = safeAmount;
      displayUnit = 'g';
    }
  }

  return {
    calories: Math.round(food.calories * multiplier),
    protein: Math.round(food.protein * multiplier * 10) / 10,
    carbs: Math.round(food.carbs * multiplier * 10) / 10,
    fat: Math.round(food.fat * multiplier * 10) / 10,
    displayQuantity,
    displayUnit,
  };
}
