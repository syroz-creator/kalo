import type { AnalyzedFoodItem, MealAnalysisResult } from '../types';

export function getMealImage(image: unknown, fallbackMime: unknown = 'image/jpeg') {
  if (typeof image !== 'string' || !image.trim()) throw new Error('Choose a meal photo first.');
  const dataUrl = image.match(/^data:([^;,]+);base64,([\s\S]+)$/);
  const mimeType = dataUrl?.[1] ?? fallbackMime;
  const data = (dataUrl?.[2] ?? image).replace(/\s/g, '');
  if (typeof mimeType !== 'string' || !['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'].includes(mimeType)) {
    throw new Error('Use a JPEG, PNG, WebP, HEIC, or HEIF photo.');
  }
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(data)) throw new Error('This photo could not be read. Please select it again.');
  return { mimeType, data };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nutrient(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new Error('The scan returned incomplete nutrition values. Please try again.');
  }
  return value;
}

export function normalizeMealAnalysis(value: unknown): MealAnalysisResult {
  if (!isRecord(value) || typeof value.dishName !== 'string' || !value.dishName.trim() || !Array.isArray(value.items)) {
    throw new Error('The scan returned an incomplete result. Please try again.');
  }
  if (!value.items.length) throw new Error('No food was identified. Try a clear photo of your meal.');
  const items: AnalyzedFoodItem[] = value.items.map(item => {
    if (!isRecord(item) || typeof item.name !== 'string' || !item.name.trim() || typeof item.portion !== 'string') {
      throw new Error('The scan returned incomplete food details. Please try again.');
    }
    return {
      name: item.name.trim(), portion: item.portion,
      calories: nutrient(item.calories), protein: nutrient(item.protein),
      carbs: nutrient(item.carbs), fat: nutrient(item.fat),
    };
  });
  const total = (key: 'calories' | 'protein' | 'carbs' | 'fat') => items.reduce((sum, item) => sum + item[key], 0);
  return {
    dishName: value.dishName.trim(),
    referenceObjectDetected: typeof value.referenceObjectDetected === 'string' ? value.referenceObjectDetected : '',
    referenceTip: typeof value.referenceTip === 'string' ? value.referenceTip : '',
    notes: typeof value.notes === 'string' ? value.notes : '',
    items,
    totalCalories: Math.round(total('calories')),
    totalProtein: Math.round(total('protein') * 10) / 10,
    totalCarbs: Math.round(total('carbs') * 10) / 10,
    totalFat: Math.round(total('fat') * 10) / 10,
  };
}
