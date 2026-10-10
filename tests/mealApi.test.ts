import assert from 'node:assert/strict';
import test, { beforeEach } from 'node:test';
import { analyzeMealPhoto, checkGeminiKey, getGeminiKey, removeGeminiKey, saveGeminiKey } from '../src/services/mealApi';

const entries = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
  getItem: (key: string) => entries.get(key) ?? null,
  setItem: (key: string, value: string) => entries.set(key, value),
  removeItem: (key: string) => entries.delete(key),
} });
beforeEach(() => { removeGeminiKey(); entries.clear(); });

const photo = 'data:image/png;base64,aGVsbG8=';
const meal = { dishName: 'Eggs', items: [{ name: 'Eggs', portion: '120 g', calories: 180, protein: 15, carbs: 2, fat: 12 }] };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const generation = (value: unknown) => json({ candidates: [{ content: { role: 'model', parts: [{ text: JSON.stringify(value) }] }, finishReason: 'STOP' }] });

test('keys are trimmed, persist locally, and can be removed without deleting meal data', () => {
  entries.set('kalo_logged_items_v2', '[{"name":"Eggs"}]');
  assert.equal(saveGeminiKey('  personal-test-key  '), 'personal-test-key');
  assert.equal(getGeminiKey(), 'personal-test-key');
  assert.throws(() => saveGeminiKey(' '), /Enter your Gemini API key/);
  removeGeminiKey();
  assert.equal(getGeminiKey(), '');
  assert(entries.has('kalo_logged_items_v2'));
});

test('scanning without a saved key asks for settings and makes no request', async t => {
  const fetch = t.mock.method(globalThis, 'fetch', async () => { throw new Error('Unexpected network call'); });
  await assert.rejects(analyzeMealPhoto(photo), /Settings > Gemini API key/);
  assert.equal(fetch.mock.callCount(), 0);
});

test('a photo goes directly to Gemini with the device key and computes nutrition totals', async t => {
  saveGeminiKey('personal-test-key');
  t.mock.method(globalThis, 'fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    assert.equal(new URL(request.url).origin, 'https://generativelanguage.googleapis.com');
    assert.match(request.url, /:generateContent/);
    assert.equal(request.headers.get('x-goog-api-key'), 'personal-test-key');
    const body = await request.json();
    assert.deepEqual(body.contents[0].parts[0].inlineData, { mimeType: 'image/png', data: 'aGVsbG8=' });
    assert(body.generationConfig.responseJsonSchema);
    return generation(meal);
  });
  const result = await analyzeMealPhoto(photo);
  assert.equal(result.totalCalories, 180);
  assert.equal(result.items[0].name, 'Eggs');
});

test('checking a key lists Gemini models without generating content or saving the key', async t => {
  t.mock.method(globalThis, 'fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    assert.equal(request.method, 'GET');
    assert.equal(request.headers.get('x-goog-api-key'), 'candidate-test-key');
    return json({ models: [{ name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] }] });
  });
  await checkGeminiKey(' candidate-test-key ');
  assert.equal(getGeminiKey(), '');
});

test('invalid credentials do not expose provider details or replace the saved key', async t => {
  saveGeminiKey('existing-test-key');
  t.mock.method(globalThis, 'fetch', async () => json({ error: { code: 400, status: 'INVALID_ARGUMENT', message: 'API key not valid. secret-value' } }, 400));
  await assert.rejects(checkGeminiKey('invalid-test-key'), error => {
    assert(error instanceof Error);
    assert.match(error.message, /Gemini rejected this API key/);
    assert(!error.message.includes('secret-value'));
    return true;
  });
  assert.equal(getGeminiKey(), 'existing-test-key');
});

test('quota and network failures give useful errors without leaking details', async t => {
  saveGeminiKey('personal-test-key');
  const fetch = t.mock.method(globalThis, 'fetch', async () => json({ error: { code: 429, status: 'RESOURCE_EXHAUSTED', message: 'secret-value' } }, 429));
  await assert.rejects(analyzeMealPhoto(photo), /usage limit/);
  fetch.mock.mockImplementation(async () => { throw new TypeError('Failed to fetch secret-value'); });
  await assert.rejects(analyzeMealPhoto(photo), /Check your internet connection/);
});

test('unusable results cannot be logged as meals', async t => {
  saveGeminiKey('personal-test-key');
  const fetch = t.mock.method(globalThis, 'fetch', async () => generation({ dishName: 'No food', items: [] }));
  await assert.rejects(analyzeMealPhoto(photo), /No food/);
  fetch.mock.mockImplementation(async () => generation({ ...meal, items: [{ ...meal.items[0], protein: -1 }] }));
  await assert.rejects(analyzeMealPhoto(photo), /incomplete nutrition/);
});

test('cancelling a scan aborts its Gemini request', async t => {
  saveGeminiKey('personal-test-key');
  const controller = new AbortController();
  t.mock.method(globalThis, 'fetch', async (_input: RequestInfo | URL, init?: RequestInit) => {
    assert(init?.signal);
    return new Promise<Response>((_resolve, reject) => {
      init.signal!.addEventListener('abort', () => reject(init.signal!.reason), { once: true });
      controller.abort();
    });
  });
  await assert.rejects(analyzeMealPhoto(photo, controller.signal), { name: 'AbortError' });
});
