# Kalo on your own iPhone

The iOS app bundles Kalo's interface and keeps meals, recipes, water and your
profile on the phone. Photo analysis connects directly to Gemini using the API
key you enter on your device. No Render service or running Mac is needed.

## First installation (free personal signing)

1. Install Xcode from the Mac App Store and open it once to finish setup and
   install iOS support. Capacitor 8 requires Xcode 26 or newer.
2. In Xcode Settings > Accounts, sign in with your Apple Account.
3. From this repository, run `npm install`, then `npm run ios:sync`, then
   `npm run ios:open`.
4. Connect your unlocked iPhone to the Mac with a cable and accept Trust prompts.
5. Select the App project, then the App target > Signing & Capabilities. Enable
   automatic signing and choose your Personal Team. If the bundle identifier is
   unavailable, change it to a unique identifier and update capacitor.config.ts
   to match before syncing again.
6. Select your iPhone as the run destination and press Run. Enable Developer
   Mode on the phone if Xcode requests it. If asked, trust your developer profile
   in Settings > General > VPN & Device Management.

Free provisioning expires after seven days. Reconnect the phone and run the
project from Xcode again. Keep the same bundle identifier, and do not delete the
app to renew signing; deleting it removes its local data.

## Gemini photo scanning

1. Create a Gemini API key at https://aistudio.google.com/apikey.
2. In Kalo, open Settings > Gemini API key, paste your key, and tap Check & save.
3. Scan a meal. Photos go directly from the phone to Google Gemini.

The check verifies that Gemini accepts the key and lists generation models;
remaining quota and photo analysis are checked when you scan. Remove saved key
deletes the device's copy, but does not revoke the key in Google AI Studio.

This personal-use mode stores the key in the app's local storage, not the iOS
Keychain. It is not encrypted and someone with access to the app's storage can
extract it. It is excluded from Kalo's data export and is never bundled in the
source or a VITE_ variable. Each device/browser needs its own setup. Photo
scanning needs internet; viewing local logs and manual logging do not.

## Updates and data

After code changes: `npm run ios:sync`, then Run in Xcode again. Sync rebuilds the
web assets copied into the native project. Generated assets and personal Xcode
signing state are excluded from git.

The installed app has separate storage from Safari. Existing website records do
not transfer automatically. This first setup does not implement import, native
file sharing or native notification reminders; the existing browser export and
notification APIs may not be available in the iOS web view. Do not delete the
website records expecting them to already exist in the installed app.

## References

- https://capacitorjs.com/docs/getting-started/environment-setup
- https://capacitorjs.com/docs/ios
- https://developer.apple.com/help/account/basics/about-your-developer-account
