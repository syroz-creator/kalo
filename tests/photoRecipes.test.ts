import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { LoggedItem } from '../src/types';
import { collectPhotoRecipes } from '../src/utils/photoRecipes';

const photo: LoggedItem = { id: 'log-1', foodId: 'scan-1', name: 'Eggs and toast', date: '2026-10-10', meal: 'breakfast', quantity: 1, unit: 'plate', calories: 300, protein: 20, carbs: 25, fat: 12, source: 'ai_camera', createdAt: 1, imageUrl: 'data:image/png;base64,photo', ingredients: [{ name: 'Eggs', portion: '120 g', calories: 180, protein: 15, carbs: 2, fat: 12 }] };

test('recipes contain only photographed AI meals, retaining detected ingredients', () => {
  const recipes = collectPhotoRecipes([photo, { ...photo, id: 'manual', foodId: 'manual', source: 'custom' }, { ...photo, id: 'no-photo', foodId: 'missing', imageUrl: undefined }]);
  assert.deepEqual(recipes, [photo]);
  assert.equal(recipes[0].ingredients?.[0].name, 'Eggs');
});

test('logging the same photographed meal again does not duplicate its recipe', () => {
  const latest = { ...photo, id: 'log-2', createdAt: 2, calories: 320 };
  assert.deepEqual(collectPhotoRecipes([photo, latest]), [latest]);
});

test('distinct scans remain separate even when their dish names match', () => {
  const next = { ...photo, id: 'log-2', foodId: 'scan-2', createdAt: 2 };
  assert.deepEqual(collectPhotoRecipes([photo, next]), [next, photo]);
});
