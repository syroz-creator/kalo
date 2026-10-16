import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { parseAst } from 'rolldown/parseAst';
import { direction, languageKey, localeFor, readLanguage, translate, type Language } from '../src/i18n/core';
import { messages } from '../src/i18n/messages';
import { errorMessages } from '../src/i18n/errors';
import { createMealAnalyzer } from '../src/services/mealAnalyzer';

const catalog = { ...messages, ...errorMessages };
const components = ['TodayTab', 'ProgressTab', 'RecipesTab', 'SettingsTab', 'ContactSheet', 'AiMealScanner', 'MealCamera', 'MealScanLoading', 'ToastAnimation', 'MealScanResult', 'MealIngredientForm', 'EditLoggedModal', 'OnboardingModal', 'ManualMealModal', 'BarcodeMealModal', 'GoalCelebration', 'GeminiKeySettings', 'MealPortionEditor', 'ProductPortionControls', 'PlanSettings', 'NumberPicker', 'OpeningSplash', 'MealRow', 'LanguageSelector'];
// The parser is part of the existing Vite toolchain; inspect messages without matching code with regexes.
function visit(node: any, callback: (node: any) => void) {
  if (!node || typeof node !== 'object') return;
  if (node.type) callback(node);
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach(child => visit(child, callback));
    else if (value && typeof value === 'object') visit(value, callback);
  }
}

test('every catalog message has Arabic and Hebrew with matching interpolation fields', () => {
  const fields = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();
  for (const [key, translations] of Object.entries(catalog)) {
    assert.equal(translations.length, 2, key);
    for (const translation of translations) {
      assert.ok(translation.trim(), key);
      assert.deepEqual(fields(translation), fields(key), key);
    }
  }
});

test('reachable screens have no untranslated static JSX or missing catalog entries', () => {
  for (const path of ['src/App.tsx', ...components.map(name => `src/components/${name}.tsx`)]) {
    const source = readFileSync(path, 'utf8');
    visit(parseAst(source, { lang: 'tsx' }), node => {
      if (node.type === 'JSXText') assert.ok(!/[a-z]/i.test(node.value), `${path}: ${node.value.trim()}`);
      if (node.type === 'CallExpression' && node.callee.name === 't' && node.arguments[0]?.type === 'Literal') {
        const key = node.arguments[0].value;
        assert.ok(Object.hasOwn(catalog, key), `${path}: missing ${key}`);
      }
      if (node.type === 'Property' && ['label', 'description', 'desc'].includes(node.key.name) && typeof node.value.value === 'string') {
        assert.ok(Object.hasOwn(catalog, node.value.value), `${path}: missing ${node.value.value}`);
      }
    });
  }
});

test('all friendly service and storage errors are translated', () => {
  const paths = ['src/services/mealApi.ts', 'src/services/mealAnalyzer.ts', 'src/services/contact.ts', 'src/services/barcodeFood.ts', 'src/services/barcodeReader.ts', 'src/services/mealImage.ts', 'src/services/native.ts', 'src/services/storage.ts', 'src/utils/useMealHistory.ts', 'src/utils/mealAnalysis.ts'];
  function check(node: any) {
    if (node?.type === 'Literal' && typeof node.value === 'string' && node.value) assert.ok(Object.hasOwn(catalog, node.value), `missing error: ${node.value}`);
    else if (node?.type === 'ConditionalExpression') { check(node.consequent); check(node.alternate); }
  }
  for (const path of paths) visit(parseAst(readFileSync(path, 'utf8'), { lang: 'ts' }), node => {
    if (node.type === 'NewExpression' && node.callee.name === 'UserFacingError') check(node.arguments[0]);
    if (node.type === 'CallExpression' && node.callee.name === 'setError') check(node.arguments[0]);
    if (node.type === 'VariableDeclarator' && ['timeoutMessage', 'recoveryNotice'].includes(node.id.name)) check(node.init);
  });
});

test('language preferences validate saved values and survive inaccessible storage', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  try {
    for (const language of ['en', 'ar', 'he', 'invalid', null]) {
      Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (key: string) => { assert.equal(key, languageKey); return language; } } });
      assert.equal(readLanguage(), ['en', 'ar', 'he'].includes(language ?? '') ? language : 'en');
    }
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, get: () => { throw new Error('Blocked'); } });
    assert.equal(readLanguage(), 'en');
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else delete (globalThis as any).localStorage;
  }
});

test('RTL, local date formatting, English fallback, and user-supplied values remain correct', () => {
  for (const language of ['en', 'ar', 'he'] as Language[]) {
    assert.equal(direction(language), language === 'en' ? 'ltr' : 'rtl');
    assert.ok(new Intl.DateTimeFormat(localeFor(language)).format(new Date(2026, 9, 12)));
    assert.equal(translate('Unknown message', language), 'Unknown message');
    assert.equal(translate('constructor', language), 'constructor');
    assert.ok(translate('Actions for {name}', language, { name: '$& فلافل 50g' }).includes('$& فلافل 50g'));
  }
  assert.equal(translate("What's your goal?", 'ar'), 'شو هدفك؟');
  assert.equal(translate('Settings', 'he'), 'הגדרות');
  assert.equal(translate('Log {calories} kcal', 'en', { calories: 120 }), 'Log 120 kcal');
});

test('photo and text estimates request the selected language without changing structured nutrition', async () => {
  const requests: any[] = [];
  const ai = { models: { generateContent: async (request: unknown) => {
    requests.push(request);
    return { text: JSON.stringify({ dishName: 'Test brand', items: [{ name: 'Food', portion: '2 pieces', calories: 120, protein: 3, carbs: 16, fat: 5, portionQuantity: 2, portionUnit: 'piece' }] }) };
  } } };
  const analyze = createMealAnalyzer(ai as any);
  for (const [language, expected] of [['en', /English/], ['ar', /conversational Palestinian Arabic/], ['he', /Hebrew/]] as const) {
    for (const image of [undefined, { mimeType: 'image/png', data: 'aGVsbG8=' }]) {
      const result = await analyze(image, '2 biscuits', undefined, language);
      assert.match(requests.at(-1).config.systemInstruction, expected);
      assert.match(requests.at(-1).config.systemInstruction, /brand names unchanged/);
      assert.match(requests.at(-1).config.systemInstruction, /portionUnit enum values in English/);
      assert.equal(result.totalCalories, 120);
      assert.equal(result.items[0].portionUnit, 'piece');
    }
  }
});
