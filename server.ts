import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Support large base64 image uploads from camera / file picker
  app.use(express.json({ limit: '25mb' }));

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  // Health endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', hasGeminiKey: !!process.env.GEMINI_API_KEY });
  });

  // Endpoint: Analyze meal image using Gemini 3.8 Flash
  app.post('/api/analyze-meal', async (req, res) => {
    try {
      const { imageBase64, mimeType = 'image/jpeg', userNotes } = req.body;

      if (!imageBase64) {
        return res.status(400).json({
          success: false,
          error: 'Image data is required',
        });
      }

      // Remove base64 data URL prefix if present
      const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');

      const promptText = `You are Kalo's AI Clinical Nutritionist & Portion Calibration Engine.
Analyze this meal image with precision to estimate calories and macronutrients.

CRITICAL INSTRUCTIONS FOR SCALE & UTENSIL DETECTION:
1. Examine the image carefully for spatial reference items:
   - Fork, spoon, knife, chopsticks, plate rim, drinking glass, or a hand placed beside the food.
2. If a fork or utensil is present: Use standard fork dimensions (~18-20cm length, ~2.5cm tines) to calibrate physical plate depth and volume. Explicitly describe how the detected utensil scaled the portion.
3. If no fork or utensil is detected: Explain that portion volume was estimated from standard plate diameter, and give a friendly reminder: "Tip: Place a fork or your hand next to your plate next time for millimeter-accurate portion scaling!"
4. Identify every distinct ingredient/item on the plate.
5. Provide realistic, scientifically sound grams, calories (kcal), protein (g), carbs (g), and fat (g).

User note (if any): "${userNotes || 'None'}"

Return ONLY valid JSON matching this schema:
{
  "dishName": "Concise name of the overall dish or meal",
  "referenceObjectDetected": "e.g. Standard fork detected (~19cm) - calibrated portion scale or Standard plate baseline",
  "referenceTip": "Tip regarding placing a fork or utensil next to the meal to gauge portion size accurately",
  "items": [
    {
      "name": "Food item / ingredient name",
      "portion": "e.g. 160g or 1 cup",
      "calories": 250,
      "protein": 28.5,
      "carbs": 4.0,
      "fat": 12.0
    }
  ],
  "totalCalories": 580,
  "totalProtein": 42.0,
  "totalCarbs": 35.0,
  "totalFat": 22.0,
  "notes": "Short nutritional observation (e.g. High in lean protein, moderate healthy fats)"
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: cleanBase64,
                },
              },
              {
                text: promptText,
              },
            ],
          },
        ],
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });

      const responseText = response.text || '';
      let parsedResult;
      try {
        parsedResult = JSON.parse(responseText);
      } catch {
        // Attempt regex extraction if wrapped in markdown
        const match = responseText.match(/\{[\s\S]*\}/);
        if (match) {
          parsedResult = JSON.parse(match[0]);
        } else {
          throw new Error('Unable to parse JSON from AI model response');
        }
      }

      return res.json({
        success: true,
        data: parsedResult,
      });
    } catch (err: unknown) {
      console.error('Error analyzing meal with Gemini:', err);
      return res.status(500).json({
        success: false,
        error: (err as Error)?.message || 'Failed to analyze meal image',
      });
    }
  });

  // Vite middlewares in development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: process.env.DISABLE_HMR !== 'true' },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Kalo server running on http://0.0.0.0:${port}`);
  });
}

startServer();
