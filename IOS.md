# Kalo on iPhone

The Capacitor project is `ios/App/App.xcodeproj`, scheme `App`, bundle identifier
`com.ahmaduwaida.kalo`. Meals, water, workouts and progress photos stay on the device.
Estimates use the personal Gemini key entered in Settings, directly from the
device. The hosted server is used for contact messages, not meal analysis.

## Build and Install

1. Install full Xcode and iOS platform support.
2. Run `npm ci`, `npm run lint`, `npm test` and `npm run ios:sync`.
3. Run `npm run ios:open`.
4. In App target > Signing & Capabilities, select your own team and automatic signing.
   Keep signing credentials and personal team changes private.
5. Connect an unlocked iPhone, trust the Mac, enable Developer Mode if requested,
   select the phone as the run destination and press Run.
6. If a macOS codesign prompt appears, authorize it in that dialog using the
   login keychain password. Never share the password in chat.
7. If iOS asks for developer trust, use Settings > General > VPN & Device Management
   and trust only your own development account.

When the Mac still selects Command Line Tools, a single build can use:
`DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcodebuild ...`
without changing the system-wide selection.

## Meal Estimates

Open Settings > Gemini API key on the iPhone, enter your own key, review and
confirm photo processing, then choose Check & save. The native app cannot inherit
the key saved in Safari. Keys are deliberately excluded from backup exports.

The camera button opens the native camera without an invitation or API key.
If a key is missing after taking a photo, Kalo offers key setup and manual logging.
With a saved key, the photo proceeds directly to the estimate. Camera cancellation,
permissions and gallery selection must also be tested on physical hardware.

## Device Checks

- Cold start, sharp vector opening and toaster animations, and reduced-motion alternatives.
- Camera permission grant/denial, cancel, retry, photo library and app resume.
- Successful food estimate, unclear photo, quota/network error and cancellation.
- Portion correction, water beside food, logging once, recipe save and repeat logging.
- Backup/restore, private progress photos, EN/AR/HE layout and light/dark themes.

Safari and native app storage are separate. Transfer records using backup/restore,
not by deleting website data. Never uninstall the app merely to update its assets.

## Distribution Later

Personal-device testing does not publish the app. TestFlight and App Store release
are separate signing, membership and review workflows. Review provider terms,
privacy disclosures and the personal-key approach before public distribution.
