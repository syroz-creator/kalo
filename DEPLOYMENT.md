# Deployment

Kalo's interface now scans photos directly through Gemini using a key entered
in Settings > Gemini API key. It can run as a static site or a bundled iOS app
without a Render Web Service.

## Static site

- Build command: `npm ci --include=dev && npm run build`
- Publish directory: `dist`
- No server API key or start command is required.

Open the app, enter your key in Settings > Gemini API key, and tap Check & save.
Create a key at https://aistudio.google.com/apikey. Key validation lists available
generation models; actual scanning still requires remaining quota.

The key is stored in local storage on that device/browser and is not encrypted.
This is intended for personal use. Do not embed a shared key in source files,
the native bundle, or VITE_ variables. Data exports exclude the key. Removing it
from Kalo does not revoke it at Google.

## Existing Node service

The optional Node server still serves the built app and `/api/analyze-meal` for
existing API clients. Kalo's current interface uses the device key directly.

For an existing Render Node Web Service, use:

- Build command: `npm ci --include=dev && npm run build`
- Start command: `npm start`
- Health check path: `/api/health`
- Environment: `GEMINI_API_KEY` set to your private Gemini key

Save the settings and deploy the latest commit. Adding `render.yaml` to the
repository does not automatically change an existing manually configured service.
For a new deployment, the supplied Render Blueprint defines the Node service.
These Node settings are not required for a static deployment.

Open `https://YOUR-KALO-SITE/api/health` after deploying. Expect JSON containing
`"status":"ok"` and `"hasGeminiKey":true`. This checks that the backend is running
and sees a configured key; it does not verify the key's validity or quota.
If this URL shows the app or an HTML error, the backend is not being reached.

Keep keys in the server environment, never in `VITE_` variables or source files.
