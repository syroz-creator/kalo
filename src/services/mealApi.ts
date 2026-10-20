import { ApiError, GoogleGenAI } from '@google/genai';
import { createMealAnalyzer } from './mealAnalyzer';
import { prepareMealImage } from './mealImage';
import { withRequestDeadline } from './requestDeadline';
import { getMealDescription } from '../utils/mealAnalysis';
import { UserFacingError } from '../utils/userFacingError';
import { getLanguage } from '../i18n';
import { loadUserProfile } from './storage';

const storageKey = 'kalo-gemini-api-key';
export const scanTimeoutMs = 36000;
let connection: { key: string; analyze: ReturnType<typeof createMealAnalyzer> } | undefined;

export function getGeminiKey() {
  try { return localStorage.getItem(storageKey)?.trim() || ''; }
  catch { return ''; }
}

export function saveGeminiKey(value: string) {
  const key = value.trim();
  if (!key) throw new UserFacingError('Enter your Gemini API key.');
  try { localStorage.setItem(storageKey, key); }
  catch { throw new UserFacingError('Your key could not be saved on this device. Check that your browser allows storage and try again.'); }
  connection = undefined;
  return key;
}

export function removeGeminiKey() {
  try { localStorage.removeItem(storageKey); }
  catch { throw new UserFacingError('Could not remove your API key. Please try again.'); }
  connection = undefined;
}

function createClient(key: string) {
  return new GoogleGenAI({ apiKey: key, httpOptions: { timeout: scanTimeoutMs, retryOptions: { attempts: 1 } } });
}

function geminiError(error: unknown, checkingKey = false): UserFacingError {
  if (error instanceof UserFacingError) return error;
  const message = error instanceof Error ? error.message : '';
  const timeoutMessage = checkingKey
    ? 'Checking your key took too long. Please try again in a moment.'
    : 'Your meal estimate took too long. Please try again, or log your meal manually.';
  if (error instanceof Error && (error.name === 'TimeoutError' || /timeout|timed out/i.test(message))) return new UserFacingError(timeoutMessage);
  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403 || /API_KEY_INVALID|API key not valid|API_KEY_EXPIRED/i.test(message)) {
      return new UserFacingError('This key could not connect to Gemini. Check it in Settings > Gemini API key, or create a new key in Google AI Studio.');
    }
    if (error.status === 429) return new UserFacingError('You have reached your Gemini usage limit. Try again later, or check your plan in Google AI Studio.');
    if (error.status === 402) return new UserFacingError('Gemini needs available credits to continue. Check billing in Google AI Studio, then try again.');
    if (error.status === 404) return new UserFacingError('Meal estimates are not available with this key. Try another key in Settings > Gemini API key.');
    if (error.status === 400) return new UserFacingError(checkingKey
      ? 'We could not check this key. Paste the full key from Google AI Studio and try again.'
      : 'Gemini could not estimate this meal. Try a clearer photo or describe what you ate.');
    if ([408, 504].includes(error.status)) return new UserFacingError(timeoutMessage);
    if ([500, 502, 503].includes(error.status)) return new UserFacingError(checkingKey
      ? 'Gemini is busy right now. Try checking your key again in a moment.'
      : 'Gemini is busy right now. Try again in a moment, or log your meal manually.');
  }
  if (error instanceof TypeError && /fetch|network|load failed|connection/i.test(message)) return new UserFacingError('Cannot connect to Gemini. Check your internet connection and try again.');
  return new UserFacingError(checkingKey
    ? 'We could not check your key right now. Please try again in a moment.'
    : 'We could not finish your meal estimate. Please try again, or log your meal manually.');
}

export async function checkGeminiKey(value: string, signal?: AbortSignal) {
  const key = value.trim();
  if (!key) throw new UserFacingError('Enter your Gemini API key.');
  signal?.throwIfAborted();
  try {
    await withRequestDeadline(async requestSignal => {
      const models = await createClient(key).models.list({ config: { pageSize: 100, abortSignal: requestSignal } });
      for await (const model of models) {
        requestSignal.throwIfAborted();
        if (model.supportedActions?.includes('generateContent')) return;
      }
      throw new UserFacingError('Meal estimates are not available with this key. Try another key in Settings > Gemini API key.');
    }, 15000, signal);
  } catch (error) {
    if (signal?.aborted) throw error;
    throw geminiError(error, true);
  }
}

async function analyzeMealInput(input: { imageUrl: string; portionDetails?: string } | { description: string }, signal?: AbortSignal) {
  signal?.throwIfAborted();
  if (loadUserProfile().age < 18) throw new UserFacingError('Gemini estimates are available to adults aged 18 and over. You can still log meals manually.');
  const key = getGeminiKey();
  if (!key) throw new UserFacingError('Add your Gemini API key in Settings > Gemini API key before estimating a meal.');
  if (connection?.key !== key) connection = { key, analyze: createMealAnalyzer(createClient(key)) };
  const activeConnection = connection;
  const language = getLanguage();
  try {
    return await withRequestDeadline(async requestSignal => {
      const image = 'imageUrl' in input ? await prepareMealImage(input.imageUrl, requestSignal) : undefined;
      requestSignal.throwIfAborted();
      return activeConnection.analyze(image, 'description' in input ? input.description : input.portionDetails, requestSignal, language);
    }, scanTimeoutMs, signal);
  }
  catch (error) {
    if (signal?.aborted) throw error;
    throw geminiError(error);
  }
}

export async function analyzeMealPhoto(imageUrl: string, signal?: AbortSignal, portionDetails = '') {
  signal?.throwIfAborted();
  return analyzeMealInput({ imageUrl, portionDetails: portionDetails.trim() ? getMealDescription(portionDetails) : undefined }, signal);
}

export async function analyzeMealDescription(description: string, signal?: AbortSignal) {
  signal?.throwIfAborted();
  return analyzeMealInput({ description: getMealDescription(description) }, signal);
}
