import assert from 'node:assert/strict';
import test, { beforeEach } from 'node:test';
import { analyzeMealDescription, analyzeMealPhoto, checkGeminiKey, getGeminiKey, removeGeminiKey, saveGeminiKey, scanTimeoutMs } from '../src/services/mealApi';
import { mealAttemptTimeoutMs } from '../src/services/mealAnalyzer';
import { getUserErrorMessage } from '../src/utils/userFacingError';

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

test('provider age restrictions stop uploads without depending on an invite or hosted service', async t => {
  saveGeminiKey('personal-test-key');
  entries.set('kalo_user_profile_v2', JSON.stringify({ age: 17 }));
  const fetch = t.mock.method(globalThis, 'fetch', async () => { throw new Error('Unexpected upload'); });
  await assert.rejects(analyzeMealPhoto(photo), /adults aged 18/);
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

test('photo refinements send portion and label details alongside the original image without a second lookup', async t => {
  saveGeminiKey('personal-test-key');
  const fetch = t.mock.method(globalThis, 'fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    assert.equal(request.method, 'POST');
    const body = await request.json();
    assert.deepEqual(body.contents[0].parts[0].inlineData, { mimeType: 'image/png', data: 'aGVsbG8=' });
    const prompt = body.contents[0].parts[1].text;
    assert.match(prompt, /prioritize legible nutrition labels/);
    assert.match(prompt, /per biscuit or piece, per serving, and per packet/);
    assert.match(prompt, /never invent label values/);
    assert.match(prompt, /state the assumed piece count or weight/);
    assert.equal(body.contents[0].parts[2].text, "User's description of the meal: 2 biscuits, 25 g total; label: 124 kcal per packet");
    return generation({ dishName: 'Kinderini', notes: 'Used the supplied two-biscuit packet label.', items: [{ name: 'Kinderini', portion: '2 biscuits (25 g)', calories: 124, protein: 1.4, carbs: 16.8, fat: 5.6 }] });
  });
  const result = await analyzeMealPhoto(photo, undefined, '  2 biscuits, 25 g total; label: 124 kcal per packet  ');
  assert.equal(fetch.mock.callCount(), 1);
  assert.equal(result.totalCalories, 124);
  assert.equal(result.items[0].portion, '2 biscuits (25 g)');
  assert.equal(result.notes, 'Used the supplied two-biscuit packet label.');
});

test('overly long photo refinement details are rejected before a network request', async t => {
  saveGeminiKey('personal-test-key');
  const fetch = t.mock.method(globalThis, 'fetch', async () => { throw new Error('Unexpected request'); });
  await assert.rejects(analyzeMealPhoto(photo, undefined, 'a'.repeat(2001)), /2,000 characters/);
  assert.equal(fetch.mock.callCount(), 0);
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
    assert.match(error.message, /Check it in Settings > Gemini API key/);
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
  await assert.rejects(analyzeMealPhoto(photo), /could not estimate the nutrition/);
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
    if (request.url.includes('gemini-3.5-flash-lite')) return json({ error: { code: 404, message: 'Model unavailable' } }, 404);
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
  await assert.rejects(analyzeMealPhoto(photo), /Check billing in Google AI Studio/);
  fetch.mock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
    if (new Request(input, init).method === 'GET') return json({ models: [] });
    return json({ error: { code: 503, message: 'secret-value' } }, 503);
  });
  await assert.rejects(analyzeMealPhoto(photo), error => {
    assert(error instanceof Error);
    assert.match(error.message, /busy right now.*Try again/);
    assert(!error.message.includes('503'));
    assert(!error.message.includes('secret-value'));
    return true;
  });
});

test('photo, text and key errors show recovery steps instead of provider codes or payloads', async t => {
  saveGeminiKey('personal-test-key');
  const fetch = t.mock.method(globalThis, 'fetch', async () => json({ models: [] }));
  for (const [status, expected] of [
    [400, /try again|Try a clearer photo/], [401, /Settings > Gemini API key/],
    [402, /Check billing/], [403, /Settings > Gemini API key/],
    [404, /Try another key/], [408, /took too long/], [429, /usage limit/],
    [500, /busy right now/], [502, /busy right now/], [503, /busy right now/],
    [504, /took too long/], [418, /Please try again/],
  ] as const) {
    fetch.mock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init);
      if (request.method === 'GET' && request.headers.get('x-goog-api-key') === 'personal-test-key') return json({ models: [] });
      return json({ error: { code: status, status: 'INTERNAL_PRIVATE_STATUS', message: 'secret-value provider stack trace' } }, status);
    });
    for (const operation of [() => analyzeMealPhoto(photo), () => analyzeMealDescription('Rice'), () => checkGeminiKey('candidate-test-key')]) {
      await assert.rejects(operation(), error => {
        const message = getUserErrorMessage(error, 'Unexpected unformatted error');
        assert.match(message, expected);
        assert.doesNotMatch(message, /HTTP|\b[45]\d{2}\b|secret-value|INTERNAL_PRIVATE_STATUS|stack trace|Unexpected unformatted/);
        return true;
      });
    }
  }
});

test('unexpected provider errors cannot pass through by imitating a local error prefix', async t => {
  saveGeminiKey('personal-test-key');
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('The scan failed: HTTP 503 secret-value'); });
  await assert.rejects(analyzeMealPhoto(photo), error => {
    assert(error instanceof Error);
    assert.match(error.message, /Please try again/);
    assert.doesNotMatch(error.message, /HTTP|503|secret-value/);
    return true;
  });
});

test('a silent photo request is aborted early and an advertised backup finishes within the overall deadline', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  saveGeminiKey('personal-test-key');
  const started = deferred();
  let firstSignal: AbortSignal;
  const models: string[] = [];
  t.mock.method(globalThis, 'fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    if (request.method === 'GET') return json({ models: [{ name: 'models/gemini-3.1-flash-lite', supportedGenerationMethods: ['generateContent'] }] });
    models.push(request.url);
    if (request.url.includes('gemini-3.5-flash-lite')) {
      firstSignal = init!.signal!;
      started.resolve();
      return new Promise<Response>(() => {});
    }
    return generation(meal);
  });
  const result = analyzeMealPhoto(photo);
  await started.promise;
  t.mock.timers.tick(mealAttemptTimeoutMs);
  assert.equal((await result).totalCalories, 180);
  assert(firstSignal!.aborted);
  assert.equal(models.length, 2);
  assert.match(models[1], /gemini-3\.1-flash-lite/);
  await analyzeMealPhoto(photo);
  assert.match(models[2], /gemini-3\.1-flash-lite/);
});

test('two silent models stop after one fallback, not an unbounded retry loop', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  saveGeminiKey('personal-test-key');
  const first = deferred();
  const second = deferred();
  let generations = 0;
  t.mock.method(globalThis, 'fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    if (new Request(input, init).method === 'GET') return json({ models: [{ name: 'models/gemini-3.1-flash-lite', supportedGenerationMethods: ['generateContent'] }] });
    generations++;
    (generations === 1 ? first : second).resolve();
    return new Promise<Response>(() => {});
  });
  const rejected = assert.rejects(analyzeMealPhoto(photo), /took too long/);
  await first.promise;
  t.mock.timers.tick(mealAttemptTimeoutMs);
  await second.promise;
  t.mock.timers.tick(mealAttemptTimeoutMs);
  await rejected;
  assert.equal(generations, 2);
});

test('a meal description sends text only with the device key and computes estimated macros', async t => {
  saveGeminiKey('personal-test-key');
  t.mock.method(globalThis, 'fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    assert.equal(request.headers.get('x-goog-api-key'), 'personal-test-key');
    const body = await request.json();
    assert(body.contents[0].parts.every((part: { text?: string; inlineData?: unknown }) => typeof part.text === 'string' && !part.inlineData));
    assert.match(body.contents[0].parts.at(-1).text, /2 eggs and 1 slice of toast/);
    assert.match(body.contents[0].parts[0].text, /typical serving/);
    assert.match(body.contents[0].parts[0].text, /prioritize legible nutrition labels/);
    assert.deepEqual(body.generationConfig.thinkingConfig, { thinkingLevel: 'MINIMAL' });
    return generation({ ...meal, notes: 'Assumed two large eggs.' });
  });
  const result = await analyzeMealDescription('  2 eggs and 1 slice of toast  ');
  assert.equal(result.totalCalories, 180);
  assert.equal(result.totalProtein, 15);
  assert.equal(result.notes, 'Assumed two large eggs.');
});

test('empty, overly long and unconfigured descriptions make no network request', async t => {
  const fetch = t.mock.method(globalThis, 'fetch', async () => { throw new Error('Unexpected request'); });
  await assert.rejects(analyzeMealDescription(' '), /Describe your meal first/);
  await assert.rejects(analyzeMealDescription('a'.repeat(2001)), /2,000 characters/);
  await assert.rejects(analyzeMealDescription('rice and chicken'), /Settings > Gemini API key/);
  assert.equal(fetch.mock.callCount(), 0);
});

test('unusable text estimates cannot become zero-calorie logged meals', async t => {
  saveGeminiKey('personal-test-key');
  const fetch = t.mock.method(globalThis, 'fetch', async () => generation({ dishName: 'No food', items: [] }));
  await assert.rejects(analyzeMealDescription('hello'), /No food/);
  fetch.mock.mockImplementation(async () => generation({ ...meal, items: [{ ...meal.items[0], fat: -1 }] }));
  await assert.rejects(analyzeMealDescription('eggs'), /could not estimate the nutrition/);
});

test('text estimation can be cancelled even if its network request never settles', async t => {
  saveGeminiKey('personal-test-key');
  const controller = new AbortController();
  const started = deferred();
  t.mock.method(globalThis, 'fetch', async () => { started.resolve(); return new Promise<Response>(() => {}); });
  const rejected = assert.rejects(analyzeMealDescription('rice and chicken', controller.signal), { name: 'AbortError' });
  await started.promise;
  controller.abort();
  await rejected;
});
