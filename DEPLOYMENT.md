# Running Kalo

Meal estimates use the personal Gemini key saved in the app's Settings. Photos,
descriptions, portion notes and the selected output language go directly to
Google Gemini. No invitation, hosted scanning database or shared server key is
needed. Never put an owner's shared key in bundled assets or VITE_ variables.

## Local Development

1. Run `npm ci`, `npm run lint` and `npm test`.
2. Run `npm run dev` and open http://localhost:3000.
3. If another server uses port 3000, run `PORT=3005 npm run dev`.
4. Open Settings > Gemini API key, enter your own key, review the photo-processing
   disclosure, and choose Check & save. Checking lists available models; it does
   not generate an estimate.
5. Take a clear meal photo. Nutrition is estimated, not measured. Water is kept
   separate from food calories and recorded only when the result is logged.

The key is stored locally, excluded from backups, and sent only to Google's API.
Safari, a native install, and different localhost ports have separate storage.
Each needs its own key setup. Do not paste keys into chat or commit them.
Provider quota, supported regions and any billing depend on the key's project.
The app does not enable billing. Gemini estimates are limited to adults.

## Optional Hosting and Contact Delivery

Render hosts the website and the contact endpoint, not Gemini scanning:

- Service type: Node Web Service.
- Build: `npm ci --include=dev && npm run build`.
- Start: `npm start`.
- Health: `/api/health` returns `{ "status": "ok" }`.
- Set RESEND_API_KEY, CONTACT_FROM_EMAIL and CONTACT_TO_EMAIL privately if contact
  delivery is needed. Never use VITE_ variables for these credentials.

No scanning disk or database is required. The server does not expose shared-key
generation or invite endpoints. Previously configured Gemini or scanning access
environment variables are unused by this version and can be removed by the owner.

## Data and Privacy

Records and progress photos stay on the device. Back up before deleting app or
browser storage; deployments do not synchronize local records between devices.
Keep exported backups private. Review public/privacy.html before distribution and
Google's applicable terms before uploading personal or sensitive content.
