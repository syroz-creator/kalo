import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { buildMealSuggestions, getMealSuggestions, type MealPreferences } from '../src/services/mealSuggestions';
import { totalFoodNutrition } from '../src/utils/mealPortions';
import { VERIFIED_FOODS } from '../src/data/verifiedFoods';
import { ProSubscription } from '../src/components/ProSubscription';
import { MealImprovements } from '../src/components/MealImprovements';
import { messages } from '../src/i18n/messages';
import type { AnalyzedFoodItem } from '../src/types';

const preferences: MealPreferences = { plantBased: false, noDairy: false, noNuts: false };
const rice: AnalyzedFoodItem = { name: 'White rice', portion: '150 g', portionQuantity: 150, portionUnit: 'g', calories: 195, protein: 4, carbs: 42, fat: .5 };
const oats: AnalyzedFoodItem = { name: 'Oatmeal with banana', portion: '1 serving', calories: 200, protein: 6, carbs: 36, fat: 3 };

test('suggestions differ by goal and context, without changing the scanned meal', () => {
  const items = [{ ...rice }], before = structuredClone(items);
  const balance = buildMealSuggestions(items, 'balance', preferences);
  const energy = buildMealSuggestions(items, 'energy', preferences);
  assert.equal(balance.length, 3); assert.equal(energy.length, 3);
  assert.match(balance[0].name, /tofu/i);
  assert.ok(energy.reduce((sum, suggestion) => sum + suggestion.food.calories, 0) > balance.reduce((sum, suggestion) => sum + suggestion.food.calories, 0));
  assert.deepEqual(items, before);
  assert.equal(new Set(energy.map(suggestion => suggestion.id)).size, energy.length);
  const sweet = buildMealSuggestions([oats], 'balance', preferences);
  assert.ok(sweet.every(suggestion => !/broccoli|rice|tofu/i.test(suggestion.name)));
  assert.ok(sweet.every(suggestion => !/banana|oats/i.test(suggestion.name)));
});

test('all proposed calories and macros come from the reference portion, and addition totals are exact', () => {
  for (const goal of ['balance', 'energy'] as const) for (const items of [[rice], [oats]]) {
    for (const suggestion of buildMealSuggestions(items, goal, preferences)) {
      const reference = VERIFIED_FOODS.find(food => food.id === suggestion.id)!;
      const ratio = suggestion.food.portionQuantity! / reference.servingSize;
      assert.equal(suggestion.food.calories, Math.round(reference.calories * ratio));
      for (const field of ['protein', 'carbs', 'fat'] as const) assert.equal(suggestion.food[field], Math.round(reference[field] * ratio * 10) / 10);
      const before = totalFoodNutrition(items), after = totalFoodNutrition([...items, suggestion.food]);
      assert.equal(after.calories, before.calories + suggestion.food.calories);
      assert.ok(Object.hasOwn(messages, suggestion.name)); assert.ok(Object.hasOwn(messages, suggestion.reason));
    }
  }
});

test('plant-based, dairy-free and nut-free filters exclude unsuitable additions', () => {
  const selected = buildMealSuggestions([oats], 'energy', { plantBased: true, noDairy: true, noNuts: true });
  assert.ok(selected.length > 0);
  assert.ok(selected.every(suggestion => !/yogurt|almond|peanut|milk|cheese/.test(suggestion.name.toLowerCase())));
  const savory = buildMealSuggestions([{ ...rice, name: 'Tofu with broccoli and avocado' }], 'energy', preferences);
  assert.ok(savory.every(suggestion => !/tofu|broccoli|avocado/i.test(suggestion.name)));
});

test('removed or invalid ingredients and empty meals cannot produce meal suggestions', () => {
  assert.deepEqual(buildMealSuggestions([], 'balance', preferences), []);
  assert.deepEqual(buildMealSuggestions([{ ...rice, portionQuantity: 0 }], 'energy', preferences), []);
  assert.deepEqual(buildMealSuggestions([{ ...rice, calories: NaN }], 'energy', preferences), []);
});

test('the feature checks Pro access before generating suggestions', async () => {
  await assert.rejects(getMealSuggestions([rice], 'balance', preferences), /Kalo Pro is required/);
});

test('web subscription UI never shows fabricated pricing or an unlock switch', () => {
  const html = renderToStaticMarkup(createElement(ProSubscription, { onBack() {} }));
  assert.match(html, /Kalo iPhone app/);
  assert.match(html, /Photo estimates and meal logging stay free/);
  assert.doesNotMatch(html, /\$|₪|type="radio"|Start free trial|role="switch"/);
  const card = renderToStaticMarkup(createElement(MealImprovements, { items: [rice], calories: 195, onAdd() {} }));
  assert.match(card, /Improve this meal/); assert.match(card, /aria-expanded="false"/);
  assert.doesNotMatch(card, /Add to estimate/);
});
