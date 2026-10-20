import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AiMealScanner } from '../src/components/AiMealScanner';

test('the meal camera opens without a saved key and never renders the removed invite gate', () => {
  const markup = renderToStaticMarkup(createElement(AiMealScanner, {
    targetMeal: 'lunch', onClose() {}, onBarcode() {},
    onLogMealResult: async () => true, onSaveMealResult: async () => true,
  }));
  assert.match(markup, /aria-label="Meal camera"/);
  assert.match(markup, /aria-label="Take picture of meal"/);
  assert.doesNotMatch(markup, /aria-label="Beta access"/);
  assert.doesNotMatch(markup, /Gemini API key/);
});
