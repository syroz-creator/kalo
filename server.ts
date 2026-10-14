import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createMealAnalyzer } from './server/mealAnalysis';
import { getMealImage } from './src/utils/mealAnalysis';
import { getUserErrorMessage } from './src/utils/userFacingError';
import { createContactRouter, type ContactOptions } from './server/contact';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp(options: { apiKey?: string; model?: string; client?: GoogleGenAI; contact?: ContactOptions } = {}) {
  const app = express();
  const apiKey = options.apiKey ?? process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
  const hasKey = !!apiKey?.trim() && apiKey !== 'MY_GEMINI_API_KEY';
  const ai = options.client ?? (hasKey ? new GoogleGenAI({ apiKey, httpOptions: { timeout: 60000 } }) : null);
  const analyzeMeal = ai ? createMealAnalyzer(ai, options.model ?? process.env.GEMINI_MODEL) : null;

  app.use('/api/contact', createContactRouter(options.contact));
  app.use(express.json({ limit: '20mb' }));
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', hasGeminiKey: hasKey });
  });

  app.post('/api/analyze-meal', async (req, res) => {
    let image: ReturnType<typeof getMealImage>;
    try {
      image = getMealImage(req.body?.imageBase64, req.body?.mimeType);
    } catch (error) {
      return res.status(400).json({ success: false, error: getUserErrorMessage(error, 'This photo could not be read. Please select it again.') });
    }
    if (!analyzeMeal) {
      return res.status(503).json({ success: false, error: 'Meal scanning is not ready yet. Please contact the app owner, or log your meal manually.' });
    }

    try {
      const notes = typeof req.body?.userNotes === 'string' ? req.body.userNotes.slice(0, 1000) : undefined;
      const result = await analyzeMeal(image, notes);
      return res.json({ success: true, data: result });
    } catch (error) {
      const status = typeof error === 'object' && error !== null && 'status' in error ? Number(error.status) : 0;
      const message = error instanceof Error ? error.message : '';
      console.error('Meal analysis failed', { status: status || 502 });
      if (status === 401 || status === 403 || /API_KEY_INVALID|API key not valid/i.test(message)) {
        return res.status(503).json({ success: false, error: 'Meal scanning could not connect to Gemini. Please ask the app owner to check the API key.' });
      }
      if (status === 404) {
        return res.status(503).json({ success: false, error: 'Meal scanning is unavailable right now. Please contact the app owner, or log your meal manually.' });
      }
      if (status === 429) {
        return res.status(429).json({ success: false, error: 'Meal scanning has reached its usage limit. Please try again later.' });
      }
      if (status === 400) {
        return res.status(422).json({ success: false, error: 'This photo could not be analyzed. Try a JPEG or PNG photo of your meal.' });
      }
      return res.status(502).json({ success: false, error: getUserErrorMessage(error, 'We could not finish your meal estimate. Please try again, or log your meal manually.') });
    }
  });

  app.use('/api', (_req, res) => res.status(404).json({ success: false, error: 'This API endpoint is unavailable.' }));
  const jsonErrorHandler: express.ErrorRequestHandler = (error, _req, res, next) => {
    if (error.type === 'entity.too.large') {
      res.status(413).json({ success: false, error: 'This photo is too large. Choose a smaller photo and try again.' });
    } else if (error.type === 'entity.parse.failed') {
      res.status(400).json({ success: false, error: 'The photo request could not be read. Please try again.' });
    } else next(error);
  };
  app.use(jsonErrorHandler);
  return app;
}

async function startServer() {
  const app = createApp();
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: process.env.DISABLE_HMR !== 'true' },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')));
  }

  app.listen(port, '0.0.0.0', () => console.log(`Kalo server running on http://localhost:${port}`));
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  startServer().catch(error => {
    console.error('Could not start Kalo:', error instanceof Error ? error.message : 'Unknown error');
    process.exitCode = 1;
  });
}
