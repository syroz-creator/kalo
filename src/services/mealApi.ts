import { ApiError, GoogleGenAI } from '@google/genai';
import { getMealImage } from '../utils/mealAnalysis';
import { createMealAnalyzer } from './mealAnalyzer';

const storageKey = 'kalo-gemini-api-key';
let connection: { key: string; analyze: ReturnType<typeof createMealAnalyzer> } | undefined;

export function getGeminiKey() {
  try { return localStorage.getItem(storageKey)?.trim() || ''; }
  catch { return ''; }
}

export function saveGeminiKey(value: string) {
  const key = value.trim();
  if (!key) throw new Error('Enter your Gemini API key.');
  try { localStorage.setItem(storageKey, key); }
  catch { throw new Error('Could not save your API key on this device. Check that storage is available.'); }
  connection = undefined;
  return key;
}

export function removeGeminiKey() {
  try { localStorage.removeItem(storageKey); }
  catch { throw new Error('Could not remove your API key. Please try again.'); }
  connection = undefined;
}

function createClient(key: string) {
  return new GoogleGenAI({ apiKey: key, httpOptions: { timeout: 60000 } });
}

function geminiError(error: unknown): Error {
  const message = error instanceof Error ? error.message : '';
  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403 || /API_KEY_INVALID|API key not valid|API_KEY_EXPIRED/i.test(message)) {
      return new Error('Gemini rejected this API key. Update it in Settings > Gemini API key and check its permissions.');
    }
    if (error.status === 429) return new Error('Your Gemini usage limit has been reached. Check your quota in Google AI Studio or try again later.');
    if (error.status === 404) return new Error('No compatible meal-scanning model is available for this API key.');
    if (error.status === 400) return new Error('Gemini could not process this request. Check your API key or try a JPEG or PNG meal photo.');
    return new Error('Gemini is temporarily unavailable. Please try again.');
  }
  if (/^(The scan |No food |No compatible meal-scanning model)/.test(message)) return new Error(message);
  if (error instanceof Error && /timeout|timed out/i.test(message)) return new Error('Gemini took too long to respond. Please try again.');
  return new Error('Cannot connect to Gemini. Check your internet connection and try again.');
}

export async function checkGeminiKey(value: string, signal?: AbortSignal) {
  const key = value.trim();
  if (!key) throw new Error('Enter your Gemini API key.');
  signal?.throwIfAborted();
  try {
    const models = await createClient(key).models.list({ config: { pageSize: 100, abortSignal: signal } });
    for await (const model of models) {
      if (model.supportedActions?.includes('generateContent')) return;
    }
    throw new Error('No compatible meal-scanning model is available for this API key.');
  } catch (error) {
    if (signal?.aborted) throw error;
    throw geminiError(error);
  }
}

export async function analyzeMealPhoto(imageUrl: string, signal?: AbortSignal) {
  signal?.throwIfAborted();
  const key = getGeminiKey();
  if (!key) throw new Error('Add your Gemini API key in Settings > Gemini API key before scanning a meal.');
  const image = getMealImage(imageUrl);
  if (connection?.key !== key) connection = { key, analyze: createMealAnalyzer(createClient(key)) };
  try { return await connection.analyze(image, undefined, signal); }
  catch (error) {
    if (signal?.aborted) throw error;
    throw geminiError(error);
  }
}
