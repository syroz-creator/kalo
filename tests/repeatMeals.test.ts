import assert from 'node:assert/strict';
import test from 'node:test';
import { repeatMealChoices } from '../src/utils/repeatMeals';
import type { LoggedItem } from '../src/types';
const meal = (name: string, time: number, calories = 200): LoggedItem => ({ id: String(time), foodId: String(time), name, createdAt: time, date: '2026-10-01', meal: 'breakfast', quantity: 1, unit: 'portion', source: 'custom', calories, protein: 10, carbs: 20, fat: 5 });

test('recent meals deduplicate identical portions and keep the latest corrected version', () => {
  const history = [meal('Eggs', 10), meal('Toast', 15), meal('Eggs', 20), meal('Eggs', 21, 400)];
  const choices = repeatMealChoices(history, 'recent');
  assert.deepEqual(choices.map(c => c.item.createdAt), [21, 20, 15]);
  assert.equal(choices[1].count, 2);
  assert.deepEqual(history.map(m => m.createdAt), [10, 15, 20, 21]);
});
test('frequent meals sort by uses then recency, with case-insensitive search', () => {
  const history = [meal('Eggs', 10), meal('Toast', 15), meal('Eggs', 20), meal('Salad', 30)];
  assert.deepEqual(repeatMealChoices(history, 'frequent').map(c => c.item.name), ['Eggs', 'Salad', 'Toast']);
  assert.equal(repeatMealChoices(history, 'recent', ' eGG ').length, 1);
  assert.equal(repeatMealChoices(history, 'recent', 'not found').length, 0);
});
