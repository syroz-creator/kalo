import type { GoogleGenAI } from '@google/genai';
import { normalizeMealAnalysis } from '../utils/mealAnalysis';

const number = { type: 'number', minimum: 0 };
const responseJsonSchema = {
  type: 'object',
  properties: {
    dishName: { type: 'string' },
    referenceObjectDetected: { type: 'string' },
    referenceTip: { type: 'string' },
    notes: { type: 'string' },
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: { name: { type: 'string' }, portion: { type: 'string' }, calories: number, protein: number, carbs: number, fat: number },
        required: ['name', 'portion', 'calories', 'protein', 'carbs', 'fat'],
      },
    },
  },
  required: ['dishName', 'items'],
};

const prompt = `Identify the food in this photo and estimate each item's portion, calories (kcal), protein (g), carbs (g), and fat (g).
Include every visible food item, counting each item once. Nutrition values must describe the estimated portion, not 100g.
If a utensil, hand, or familiar object is visible, use it as an approximate portion reference and describe the assumption.
Otherwise estimate the portion from the visible meal. A photo cannot provide exact dimensions or verified nutrition.
Use concise food names and portion descriptions. Return an empty items array if no food is visible.
Return only JSON matching the supplied schema.`;

export function createMealAnalyzer(ai: GoogleGenAI, configuredModel?: string) {
  let model = configuredModel?.trim() || 'gemini-3.8-flash';
  const resolveFallback = async (signal?: AbortSignal) => {
    const available = new Set<string>();
    for await (const entry of await ai.models.list({ config: { pageSize: 100, abortSignal: signal } })) {
      signal?.throwIfAborted();
      if (entry.supportedActions?.includes('generateContent') && entry.name) available.add(entry.name.replace(/^models\//, ''));
    }
    const selected = ['gemini-3.5-flash-lite', 'gemini-3.6-flash', 'gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-2.5-flash', 'gemini-2.5-flash-lite']
      .find(name => name !== model && available.has(name));
    return selected;
  };

  return async (image: { mimeType: string; data: string }, userNotes?: string, signal?: AbortSignal) => {
    signal?.throwIfAborted();
    const generate = (name: string) => ai.models.generateContent({
      model: name,
      contents: [{ role: 'user', parts: [
        { inlineData: image },
        { text: prompt },
        ...(userNotes ? [{ text: `User's description of the meal: ${userNotes}` }] : []),
      ] }],
      config: { responseMimeType: 'application/json', responseJsonSchema, temperature: 0.2, abortSignal: signal },
    });

    let response;
    try { response = await generate(model); }
    catch (error) {
      signal?.throwIfAborted();
      const status = typeof error === 'object' && error !== null && 'status' in error ? error.status : undefined;
      if (![404, 500, 502, 503, 504].includes(Number(status)) || configuredModel?.trim()) throw error;
      const fallbackModel = await resolveFallback(signal);
      signal?.throwIfAborted();
      if (!fallbackModel) throw error;
      response = await generate(fallbackModel);
      signal?.throwIfAborted();
      model = fallbackModel;
    }

    signal?.throwIfAborted();
    const text = response.text?.trim();
    if (!text) throw new Error('The scan did not return a result. Please try another meal photo.');
    let parsed: unknown;
    try { parsed = JSON.parse(text); }
    catch { throw new Error('The scan returned an unreadable result. Please try again.'); }
    return normalizeMealAnalysis(parsed);
  };
}
