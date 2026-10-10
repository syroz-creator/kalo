import assert from 'node:assert/strict';
import test, { beforeEach } from 'node:test';
import { analyzeMealPhoto, checkGeminiKey, getGeminiKey, removeGeminiKey, saveGeminiKey, scanTimeoutMs } from '../src/services/mealApi';

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

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(done => { resolve = done; });
  return { promise, resolve };
}

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

test('a scan times out even if the transport ignores abort, and retry still succeeds', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  saveGeminiKey('personal-test-key');
  const started = deferred();
  let requestSignal: AbortSignal;
  const fetch = t.mock.method(globalThis, 'fetch', async (_input: RequestInfo | URL, init?: RequestInit) => {
    requestSignal = init!.signal!;
    started.resolve();
    return new Promise<Response>(() => {});
  });
  const rejected = assert.rejects(analyzeMealPhoto(photo), /took too long/);
  await started.promise;
  t.mock.timers.tick(scanTimeoutMs);
  await rejected;
  assert.equal(requestSignal!.aborted, true);
  fetch.mock.mockImplementation(async () => generation(meal));
  assert.equal((await analyzeMealPhoto(photo)).totalCalories, 180);
});

test('the overall deadline covers a stalled response body as well as the initial connection', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  saveGeminiKey('personal-test-key');
  const started = deferred();
  t.mock.method(globalThis, 'fetch', async () => {
    started.resolve();
    return new Response(new ReadableStream(), { headers: { 'Content-Type': 'application/json' } });
  });
  const rejected = assert.rejects(analyzeMealPhoto(photo), /took too long/);
  await started.promise;
  t.mock.timers.tick(scanTimeoutMs);
  await rejected;
});

test('a stalled fallback lookup is cancelled and does not poison the next scan', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  saveGeminiKey('personal-test-key');
  const lookupStarted = deferred();
  let lookupSignal: AbortSignal;
  const fetch = t.mock.method(globalThis, 'fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    if (request.method === 'GET') {
      lookupSignal = init!.signal!;
      lookupStarted.resolve();
      return new Promise<Response>(() => {});
    }
    return json({ error: { code: 404, status: 'NOT_FOUND', message: 'Model unavailable' } }, 404);
  });
  const rejected = assert.rejects(analyzeMealPhoto(photo), /took too long/);
  await lookupStarted.promise;
  t.mock.timers.tick(scanTimeoutMs);
  await rejected;
  assert.equal(lookupSignal!.aborted, true);
  fetch.mock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    if (request.method === 'GET') return json({ models: [{ name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] }] });
    if (request.url.includes('gemini-3.8-flash')) return json({ error: { code: 404, message: 'Model unavailable' } }, 404);
    return generation(meal);
  });
  assert.equal((await analyzeMealPhoto(photo)).totalCalories, 180);
});

test('cancellation returns immediately even when fetch never settles', async t => {
  saveGeminiKey('personal-test-key');
  const controller = new AbortController();
  const started = deferred();
  t.mock.method(globalThis, 'fetch', async () => {
    started.resolve();
    return new Promise<Response>(() => {});
  });
  const rejected = assert.rejects(analyzeMealPhoto(photo, controller.signal), { name: 'AbortError' });
  await started.promise;
  controller.abort();
  await rejected;
});

test('checking an API key also has a bounded wait', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  t.mock.method(globalThis, 'fetch', async () => new Promise<Response>(() => {}));
  const rejected = assert.rejects(checkGeminiKey('personal-test-key'), /took too long/);
  t.mock.timers.tick(15000);
  await rejected;
});

test('billing and overload errors remain actionable without exposing provider details', async t => {
  saveGeminiKey('personal-test-key');
  const fetch = t.mock.method(globalThis, 'fetch', async () => json({ error: { code: 402, message: 'secret-value' } }, 402));
  await assert.rejects(analyzeMealPhoto(photo), /billing.*HTTP 402/);
  fetch.mock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
    if (new Request(input, init).method === 'GET') return json({ models: [] });
    return json({ error: { code: 503, message: 'secret-value' } }, 503);
  });
  await assert.rejects(analyzeMealPhoto(photo), error => {
    assert(error instanceof Error);
    assert.match(error.message, /busy.*HTTP 503/);
    assert(!error.message.includes('secret-value'));
    return true;
  });
});
