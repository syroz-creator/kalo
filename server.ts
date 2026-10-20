import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createServer } from 'node:http';
import { createContactRouter, type ContactOptions } from './server/contact';

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp(options: { contact?: ContactOptions } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use('/api', (_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  app.use('/api/contact', createContactRouter(options.contact));
  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
  // Device-owned Gemini keys are used directly. Never expose the owner's key
  // through an anonymous hosted meal-analysis endpoint.
  app.use('/api', (_req, res) => res.status(404).json({ success: false, error: 'This API endpoint is unavailable.' }));
  return app;
}

async function startServer() {
  const app = createApp();
  const httpServer = createServer(app);
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: process.env.DISABLE_HMR !== 'true', ws: process.env.DISABLE_HMR === 'true' ? false : { server: httpServer } },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')));
  }

  httpServer.listen(port, '0.0.0.0', () => console.log(`Kalo server running on http://localhost:${port}`));
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  startServer().catch(error => {
    console.error('Could not start Kalo:', error instanceof Error ? error.message : 'Unknown error');
    process.exitCode = 1;
  });
}
