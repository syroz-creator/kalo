import { getMealImage, normalizeMealAnalysis } from '../utils/mealAnalysis';

export async function readMealResponse(response: Response) {
  if (!response.headers.get('content-type')?.includes('application/json')) {
    if (response.status === 413) throw new Error('This photo is too large. Choose a smaller photo and try again.');
    if (response.status >= 500) throw new Error(`The meal server is temporarily unavailable (HTTP ${response.status}). Wait a minute and try again. If this continues, check the Render service logs.`);
    throw new Error('The photo API is not running at this website. In Render, deploy Kalo as a Node Web Service with Start Command "npm start", not a Static Site or "vite preview".');
  }
  let body;
  try { body = await response.json(); }
  catch { throw new Error('The meal server returned an unreadable response. Please try again.'); }
  if (!response.ok || body?.success !== true) throw new Error(typeof body?.error === 'string' ? body.error : 'Could not analyze this meal. Please try again.');
  return normalizeMealAnalysis(body.data);
}

export async function analyzeMealPhoto(imageUrl: string, signal?: AbortSignal) {
  const image = getMealImage(imageUrl);
  let response: Response;
  try {
    response = await fetch('/api/analyze-meal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageBase64: image.data, mimeType: image.mimeType }), signal });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new Error('Cannot connect to the meal server. Check your internet connection and try again.');
  }
  return readMealResponse(response);
}
