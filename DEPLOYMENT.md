# Render Deployment

Kalo needs a Node Web Service, not a Static Site. The Node server serves both
the built app and `/api/analyze-meal`; a Vite preview server only serves the app.

For an existing Render Node Web Service, use:

- Build command: `npm ci --include=dev && npm run build`
- Start command: `npm start`
- Health check path: `/api/health`
- Environment: `GEMINI_API_KEY` set to your private Gemini key

Save the settings and deploy the latest commit. Adding `render.yaml` to the
repository does not automatically change an existing manually configured service.
For a new deployment, the supplied Render Blueprint defines the Node service.
If the current service is a Static Site, create a Node Web Service instead.

Open `https://YOUR-KALO-SITE/api/health` after deploying. Expect JSON containing
`"status":"ok"` and `"hasGeminiKey":true`. This checks that the backend is running
and sees a configured key; it does not verify the key's validity or quota.
If this URL shows the app or an HTML error, the backend is not being reached.

Keep keys in the server environment, never in `VITE_` variables or source files.
