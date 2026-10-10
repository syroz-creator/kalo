import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';
import type { Server } from 'node:http';
import { GoogleGenAI, type HttpOptions } from '@google/genai';
import { createApp } from '../server';
import { createMealAnalyzer } from '../server/mealAnalysis';
import { getMealImage, normalizeMealAnalysis } from '../src/utils/mealAnalysis';

const meal = {
  dishName: 'Chicken and rice',
  items: [
    { name: 'Chicken', portion: '150 g', calories: 240, protein: 40, carbs: 0, fat: 8.5 },
    { name: 'Rice', portion: '1 cup', calories: 200, protein: 4.2, carbs: 44, fat: 0.5 },
  ],
};
const image = { mimeType: 'image/png', data: 'aGVsbG8=' };
const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const generation = (value: unknown) => jsonResponse({ candidates: [{ content: { role: 'model', parts: [{ text: JSON.stringify(value) }] }, finishReason: 'STOP' }] });

function clientWithFetch(fetch: NonNullable<HttpOptions['fetch']>) {
  return new GoogleGenAI({ apiKey: 'test-key', httpOptions: { fetch } });
}

test('an uploaded PNG keeps its MIME type even when the caller defaults to JPEG', () => {
  assert.deepEqual(getMealImage('data:image/png;base64,aGVsbG8=', 'image/jpeg'), image);
  assert.deepEqual(getMealImage('aGVsbG8=', 'image/png'), image);
  assert.throws(() => getMealImage('data:image/svg+xml;base64,aGVsbG8='), /JPEG/);
  assert.throws(() => getMealImage(null), /Choose a meal photo/);
});

test('totals come from identified portions and invalid responses cannot log zero-calorie meals', () => {
  const result = normalizeMealAnalysis({ ...meal, totalCalories: 0 });
  assert.equal(result.totalCalories, 440);
  assert.equal(result.totalProtein, 44.2);
  assert.equal(result.totalCarbs, 44);
  assert.equal(result.totalFat, 9);
  assert.throws(() => normalizeMealAnalysis({ dishName: 'No meal', items: [] }), /No food/);
  assert.throws(() => normalizeMealAnalysis({ ...meal, items: [{ ...meal.items[0], calories: undefined }] }), /incomplete nutrition/);
  assert.throws(() => normalizeMealAnalysis({ ...meal, items: [{ ...meal.items[0], protein: -1 }] }), /incomplete nutrition/);
});

test('the Google SDK sends the real image format and a response schema', async () => {
  const ai = clientWithFetch(async (input, init) => {
    const request = new Request(input, init);
    const body = await request.json();
    assert.match(request.url, /gemini-3\.8-flash:generateContent/);
    assert.equal(body.contents[0].parts[0].inlineData.mimeType, 'image/png');
    assert.equal(body.contents[0].parts[0].inlineData.data, image.data);
    assert(body.generationConfig.responseJsonSchema);
    return generation(meal);
  });
  assert.equal((await createMealAnalyzer(ai)(image)).totalCalories, 440);
});

test('an unavailable model falls back to a model advertised for this key and caches that choice', async () => {
  let lists = 0;
  let unavailableCalls = 0;
  const ai = clientWithFetch(async (input, init) => {
    const request = new Request(input, init);
    if (request.url.includes('gemini-3.8-flash:generateContent')) {
      unavailableCalls++;
      return jsonResponse({ error: { code: 404, status: 'NOT_FOUND', message: 'Model not found for this key' } }, 404);
    }
    if (request.method === 'GET') {
      lists++;
      return jsonResponse({ models: [{ name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] }] });
    }
    assert.match(request.url, /gemini-2\.5-flash:generateContent/);
    return generation(meal);
  });
  const analyze = createMealAnalyzer(ai);
  assert.equal((await analyze(image)).totalCalories, 440);
  assert.equal((await analyze(image)).totalCalories, 440);
  assert.equal(unavailableCalls, 1);
  assert.equal(lists, 1);
});

test('explicit model selection does not silently change models', async () => {
  let calls = 0;
  const ai = clientWithFetch(async () => {
    calls++;
    return jsonResponse({ error: { code: 404, status: 'NOT_FOUND', message: 'Model not found' } }, 404);
  });
  await assert.rejects(createMealAnalyzer(ai, 'custom-model')(image));
  assert.equal(calls, 1);
});

test('an overloaded model switches once to an advertised image-capable model and caches success', async () => {
  const calls: string[] = [];
  const ai = clientWithFetch(async (input, init) => {
    const request = new Request(input, init);
    calls.push(request.url);
    if (request.method === 'GET') return jsonResponse({ models: [
      { name: 'models/gemini-3.5-flash-lite', supportedGenerationMethods: ['generateContent'] },
      { name: 'models/gemini-3.8-flash', supportedGenerationMethods: ['generateContent'] },
    ] });
    if (request.url.includes('gemini-3.8-flash')) return jsonResponse({ error: { code: 503, message: 'Model overloaded' } }, 503);
    assert.match(request.url, /gemini-3\.5-flash-lite:generateContent/);
    return generation(meal);
  });
  const analyze = createMealAnalyzer(ai);
  assert.equal((await analyze(image)).totalCalories, 440);
  assert.equal((await analyze(image)).totalCalories, 440);
  assert.equal(calls.length, 4);
  assert.equal(calls.filter(url => url.includes('gemini-3.8-flash:')).length, 1);
});

test('server errors get at most one backup attempt and do not cache a failed backup', async () => {
  const generations: string[] = [];
  const ai = clientWithFetch(async (input, init) => {
    const request = new Request(input, init);
    if (request.method === 'GET') return jsonResponse({ models: [{ name: 'models/gemini-3.5-flash-lite', supportedGenerationMethods: ['generateContent'] }] });
    generations.push(request.url);
    return jsonResponse({ error: { code: 503, message: 'Overloaded' } }, 503);
  });
  const analyze = createMealAnalyzer(ai);
  await assert.rejects(analyze(image), { status: 503 });
  await assert.rejects(analyze(image), { status: 503 });
  assert.equal(generations.length, 4);
  assert.match(generations[2], /gemini-3\.8-flash:/);
});

test('no advertised alternative preserves the original overload error', async () => {
  let calls = 0;
  const ai = clientWithFetch(async (input, init) => {
    calls++;
    if (new Request(input, init).method === 'GET') return jsonResponse({ models: [{ name: 'models/gemini-3.8-flash', supportedGenerationMethods: ['generateContent'] }] });
    return jsonResponse({ error: { code: 503, message: 'Overloaded' } }, 503);
  });
  await assert.rejects(createMealAnalyzer(ai)(image), { status: 503 });
  assert.equal(calls, 2);
});

test('credential, billing, quota and invalid request errors are not retried', async () => {
  for (const status of [400, 401, 402, 403, 429]) {
    let calls = 0;
    const ai = clientWithFetch(async () => {
      calls++;
      return jsonResponse({ error: { code: status, message: 'Rejected' } }, status);
    });
    await assert.rejects(createMealAnalyzer(ai)(image), { status });
    assert.equal(calls, 1);
  }
});

async function withServer(app: ReturnType<typeof createApp>, run: (url: string) => Promise<void>) {
  const server: Server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert(address && typeof address !== 'string');
  try { await run(`http://127.0.0.1:${address.port}`); }
  finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
}

const photoRequest = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageBase64: 'data:image/png;base64,aGVsbG8=', mimeType: 'image/jpeg' }) };

test('the meal endpoint returns computed totals through the actual SDK', async () => {
  const client = clientWithFetch(async () => generation(meal));
  await withServer(createApp({ client }), async url => {
    const response = await fetch(`${url}/api/analyze-meal`, photoRequest);
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.data.totalCalories, 440);
    assert.equal(result.data.totalProtein, 44.2);
  });
});

test('the app starts without a key and returns an actionable configuration error', async () => {
  await withServer(createApp({ apiKey: '' }), async url => {
    assert.equal((await fetch(`${url}/api/health`)).status, 200);
    const response = await fetch(`${url}/api/analyze-meal`, photoRequest);
    assert.equal(response.status, 503);
    assert.match((await response.json()).error, /GEMINI_API_KEY/);
    const invalid = await fetch(`${url}/api/analyze-meal`, { ...photoRequest, body: '{}' });
    assert.equal(invalid.status, 400);
  });
});

test('invalid API keys return an actionable error without exposing provider details', async () => {
  const client = clientWithFetch(async () => jsonResponse({ error: { code: 400, status: 'INVALID_ARGUMENT', message: 'API key not valid. test-secret-value' } }, 400));
  await withServer(createApp({ client }), async url => {
    const response = await fetch(`${url}/api/analyze-meal`, photoRequest);
    assert.equal(response.status, 503);
    const result = await response.json();
    assert.match(result.error, /API key/);
    assert(!result.error.includes('test-secret-value'));
  });
});
