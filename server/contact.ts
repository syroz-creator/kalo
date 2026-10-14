import express from 'express';

export interface ContactOptions {
  apiKey?: string;
  from?: string;
  to?: string;
  fetch?: typeof fetch;
}

export function createContactRouter(options: ContactOptions = {}) {
  const router = express.Router();
  const apiKey = options.apiKey ?? process.env.RESEND_API_KEY;
  const from = options.from ?? process.env.CONTACT_FROM_EMAIL ?? 'Kalo <onboarding@resend.dev>';
  const to = options.to ?? process.env.CONTACT_TO_EMAIL ?? 'uwaidaahmad@gmail.com';
  const send = options.fetch ?? fetch;
  const attempts: number[] = [];

  router.use((req, res, next) => {
    const origin = req.get('origin');
    if (origin) {
      let sameHost = false;
      try { sameHost = new URL(origin).host === req.get('host'); } catch { /* Reject malformed origins below. */ }
      if (!sameHost && !['capacitor://localhost', 'http://localhost', 'https://localhost'].includes(origin)) {
        res.status(403).json({ success: false });
        return;
      }
      res.set('Access-Control-Allow-Origin', origin);
      res.vary('Origin');
      res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type');
    }
    if (req.method === 'OPTIONS') { res.sendStatus(204); return; }
    next();
  });
  router.use(express.json({ limit: '16kb' }));
  router.post('/', async (req, res) => {
    const { category, message, replyEmail = '', requestId } = req.body ?? {};
    if (!['complaint', 'suggestion'].includes(category) || typeof message !== 'string' || !message.trim() || message.length > 2000
      || typeof replyEmail !== 'string' || replyEmail.length > 254 || (replyEmail.trim() && !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(replyEmail.trim()))
      || typeof requestId !== 'string' || !/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(requestId)) {
      res.status(400).json({ success: false });
      return;
    }
    if (!apiKey?.trim()) { res.status(503).json({ success: false }); return; }

    // Bound provider calls for this public inbox without keeping user messages in memory.
    const now = Date.now();
    while (attempts.length && attempts[0] <= now - 60000) attempts.shift();
    if (attempts.length >= 10) { res.set('Retry-After', '60').status(429).json({ success: false }); return; }
    attempts.push(now);
    try {
      const response = await send('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey.trim()}`, 'Content-Type': 'application/json', 'Idempotency-Key': `kalo-contact/${requestId}` },
        body: JSON.stringify({ from, to: [to], subject: `Kalo ${category}`, text: message.trim(), ...(replyEmail.trim() ? { reply_to: replyEmail.trim() } : {}) }),
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) {
        console.error('Contact email rejected', { status: response.status });
        res.status(response.status === 429 ? 429 : 502).json({ success: false });
        return;
      }
      const result = await response.json();
      if (typeof result.id !== 'string' || !result.id.trim()) throw new Error('Missing email receipt');
      res.json({ success: true, id: result.id });
    } catch {
      res.status(502).json({ success: false });
    }
  });
  const parseError: express.ErrorRequestHandler = (error, _req, res, next) => {
    if (error.type === 'entity.too.large') res.status(413).json({ success: false });
    else if (error.type === 'entity.parse.failed') res.status(400).json({ success: false });
    else next(error);
  };
  router.use(parseError);
  return router;
}
