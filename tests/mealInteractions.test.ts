import assert from 'node:assert/strict';
import test from 'node:test';
import { foodPortion, resizeFoodPortion, totalFoodNutrition } from '../src/utils/mealPortions';
import { crossesDailyTarget } from '../src/utils/goalCelebration';
import { mealSwipeAction } from '../src/utils/mealSwipe';
import { normalizeMealAnalysis } from '../src/utils/mealAnalysis';

const biscuit = { name: 'Kinderini', portion: '2 biscuits (25 g)', calories: 124, protein: 1.4, carbs: 16.8, fat: 5.6 };

test('piece portions and legacy gram portions scale from the original food', () => {
  assert.deepEqual(foodPortion(biscuit), { amount: 2, unit: 'piece' });
  assert.equal(resizeFoodPortion(biscuit, 1).calories, 62);
  assert.equal(resizeFoodPortion(biscuit, 3).calories, 186);
  assert.equal(resizeFoodPortion({ ...biscuit, portion: '25 g' }, 12.5).calories, 62);
  assert.deepEqual(foodPortion({ ...biscuit, portion: 'A small bowl' }), { amount: 1, unit: 'serving' });
  assert.equal(resizeFoodPortion(biscuit, 0).calories, 0);
  assert.equal(resizeFoodPortion(biscuit, NaN).calories, 0);
  assert.deepEqual(totalFoodNutrition([resizeFoodPortion(biscuit, 1), resizeFoodPortion(biscuit, 2)]), { calories: 186, protein: 2.1, carbs: 25.2, fat: 8.4 });
});

test('structured AI portion metadata survives validation and invalid metadata cannot poison estimates', () => {
  const item = { ...biscuit, portionQuantity: 2, portionUnit: 'piece', gramsPerPiece: 12.5 };
  assert.deepEqual(normalizeMealAnalysis({ dishName: 'Biscuits', items: [item] }).items[0], item);
  const invalid = normalizeMealAnalysis({ dishName: 'Biscuits', items: [{ ...item, portionQuantity: Infinity, gramsPerPiece: -2, portionUnit: 'nonsense' }] }).items[0];
  assert.equal(invalid.portionQuantity, undefined); assert.equal(invalid.gramsPerPiece, undefined);
  assert.equal(invalid.calories, 124);
});

test('only deliberate swipes commit; short swipes and opposite-direction flicks snap back', () => {
  assert.equal(mealSwipeAction(-140, 0, 390), 'delete');
  assert.equal(mealSwipeAction(140, 0, 390), 'repeat');
  assert.equal(mealSwipeAction(-30, -2, 390), null);
  assert.equal(mealSwipeAction(-70, -0.8, 390), 'delete');
  assert.equal(mealSwipeAction(-70, 0.8, 390), null);
  assert.equal(mealSwipeAction(-80, 0, 320), null);
  assert.equal(mealSwipeAction(-120, 0, 320), 'delete');
});

test('celebrations require an uncelebrated crossing of the same daily target', () => {
  const previous = { date: '2026-10-11', target: 2000, total: 1900 };
  assert(crossesDailyTarget(previous, { ...previous, total: 2000 }, false));
  assert(crossesDailyTarget(previous, { ...previous, total: 2100 }, false));
  assert(!crossesDailyTarget(previous, { ...previous, total: 2000 }, true));
  assert(!crossesDailyTarget(previous, { ...previous, total: 1999 }, false));
  assert(!crossesDailyTarget({ ...previous, total: 2100 }, { ...previous, total: 2200 }, false));
  assert(!crossesDailyTarget(previous, { ...previous, target: 1800 }, false));
  assert(!crossesDailyTarget(previous, { ...previous, date: '2026-10-12', total: 2100 }, false));
  assert(!crossesDailyTarget(previous, { ...previous, target: 0 }, false));
});
