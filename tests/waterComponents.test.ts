import assert from 'node:assert/strict';
import test from 'node:test';
import { Children, createElement, isValidElement, type ReactElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { TodayTab } from '../src/components/TodayTab';
import { MealScanResult } from '../src/components/MealScanResult';
import { normalizeMealAnalysis } from '../src/utils/mealAnalysis';

function elements(node: ReactNode): ReactElement<any>[] {
  const all: ReactElement<any>[] = [];
  Children.forEach(node, child => {
    if (!isValidElement<{ children?: ReactNode }>(child)) return;
    all.push(child, ...elements(child.props.children));
  });
  return all;
}
const noop = () => {};
const props = {
  selectedDate: '2026-10-17', loggedItems: [],
  energyNeeds: { bmr: 1695, tdee: 2630, equationName: 'Test', isTeenEquation: false, explanation: '', proteinTargetGrams: 164, carbsTargetGrams: 329, fatTargetGrams: 73 },
  onSelectDate: noop, onOpenLogModal: noop, onEditItem: noop, onRepeatItem: noop, onDeleteItem: () => true,
};

test('the water UI has exactly eight slots, including a partially filled bottle slot', () => {
  const tree = TodayTab({ ...props, waterMl: 500, onUpdateWaterMl: noop });
  const slots = elements(tree).find(element => element.props.className === 'journal-water__cups')!;
  const children = Children.toArray(slots.props.children) as ReactElement<any>[];
  assert.equal(children.length, 8);
  assert.equal(children[0].props.children.props.style.width, '100%');
  assert(Math.abs(Number.parseFloat(children[1].props.children.props.style.width) - 60) < .001);
  assert.equal(children[2].props.children.props.style.width, '0%');
  const html = renderToStaticMarkup(tree);
  assert.match(html, /0\.50/);
  assert.match(html, /2\.50 L/);
});

test('manual water controls add one 312.5 ml slot and stay bounded at zero and the goal', () => {
  let updated = -1;
  const make = (waterMl: number) => elements(TodayTab({ ...props, waterMl, onUpdateWaterMl: amount => { updated = amount; } }));
  const plus = make(0).find(element => element.props.className === 'icon-command journal-water__plus')!;
  plus.props.onClick(); assert.equal(updated, 312.5);
  assert.equal(make(0).find(element => element.props.className === 'icon-command journal-water__minus')!.props.disabled, true);
  const last = make(2400).find(element => element.props.className === 'icon-command journal-water__plus')!;
  last.props.onClick(); assert.equal(updated, 2500);
  assert.equal(make(2500).find(element => element.props.className === 'icon-command journal-water__plus')!.props.disabled, true);
  make(100).find(element => element.props.className === 'icon-command journal-water__minus')!.props.onClick();
  assert.equal(updated, 0);
});

const water = { name: 'Plain water', portion: '1 cup', portionQuantity: 312.5, portionUnit: 'ml', isPlainWater: true, calories: 0, protein: 0, carbs: 0, fat: 0 };
const food = { name: 'Toast', portion: '2 pieces', portionQuantity: 2, portionUnit: 'piece', calories: 160, protein: 6, carbs: 30, fat: 2 };
function scan(items: object[]) {
  const result = normalizeMealAnalysis({ dishName: 'Photo', items });
  return renderToStaticMarkup(createElement(MealScanResult, {
    result, items: result.items,
    draft: { meal: 'lunch', name: 'Photo', details: '', waterMl: String(result.waterMl ?? 0), nutrition: { calories: String(result.totalCalories), protein: String(result.totalProtein), carbs: String(result.totalCarbs), fat: String(result.totalFat) } },
    onChange: noop, onItemsChange: noop, onAddIngredient: noop, onRefine: noop, onLog: noop, onSave: noop, onRetake: noop, onClose: noop,
    valid: true, canRefine: false, busy: null, saved: false, error: '',
  }));
}

test('water-only results show editable volume and a water action, without food macros or recipe saving', () => {
  const html = scan([water]);
  assert.match(html, /Water amount \(ml\)/);
  assert.match(html, /About 1 cup/);
  assert.match(html, /Log water/);
  assert.doesNotMatch(html, /scan-result__save|scan-result__macros|scan-result__meal/);
});

test('mixed scans show water separately while retaining only the food calories and recipe action', () => {
  const html = scan([food, water]);
  assert.match(html, /Log meal · 160 kcal/);
  assert.match(html, /Water amount \(ml\)/);
  assert.match(html, /Save to Recipes/);
  assert.match(html, /Toast/);
});
