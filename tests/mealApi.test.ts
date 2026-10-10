import assert from 'node:assert/strict';
import test from 'node:test';
import { readMealResponse } from '../src/services/mealApi';

test('a frontend-only deployment gives a deployment error rather than blaming the key', async () => {
  for (const status of [200, 404, 405]) {
    await assert.rejects(readMealResponse(new Response('<html>App</html>', { status, headers: { 'Content-Type': 'text/html' } })), /Node Web Service.*npm start/);
  }
});

test('a proxy error tells the user the server is temporarily unavailable', async () => {
  await assert.rejects(readMealResponse(new Response('<html>Bad gateway</html>', { status: 502 })), /temporarily unavailable \(HTTP 502\)/);
});

test('oversized photos are reported separately from deployment problems', async () => {
  await assert.rejects(readMealResponse(new Response('Too large', { status: 413 })), /photo is too large/);
});

test('API configuration errors are preserved and broken JSON is handled', async () => {
  await assert.rejects(readMealResponse(new Response(JSON.stringify({ success: false, error: 'Check GEMINI_API_KEY' }), { status: 503, headers: { 'Content-Type': 'application/json' } })), /GEMINI_API_KEY/);
  await assert.rejects(readMealResponse(new Response('{broken', { headers: { 'Content-Type': 'application/json' } })), /unreadable response/);
});

test('successful responses still normalize the identified portions', async () => {
  const response = new Response(JSON.stringify({ success: true, data: { dishName: 'Eggs', items: [{ name: 'Eggs', portion: '120 g', calories: 180, protein: 15, carbs: 2, fat: 12 }] } }), { headers: { 'Content-Type': 'application/json' } });
  const meal = await readMealResponse(response);
  assert.equal(meal.totalCalories, 180);
  assert.equal(meal.items[0].name, 'Eggs');
});
