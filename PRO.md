# Kalo Pro

Photo estimates, portion editing, water and meal logging remain free. Pro unlocks
the optional **Improve this meal** panel on a food photo result:

- **Make it healthier** suggests complementary produce, protein and whole foods.
- **Add more calories** prioritizes energy-dense additions and substantial sides.
- Every suggestion shows its portion, estimated extra calories and macros, and
  the resulting meal calories. **Add to estimate** adds only that selected food
  through the existing ingredient editor; browsing suggestions never logs food.
- Plant-based, no-dairy and no-nuts filters apply to suggestions, not the existing
  meal. These choices are not an allergen certification.

Suggestions use the app's reference food catalog and the current edited meal.
They are curated additions, not a new AI measurement or a medical assessment.
No extra photo upload or Gemini request is made for this feature.

## RevenueCat setup

The iPhone app uses the official `@revenuecat/purchases-capacitor` SDK. RevenueCat
owns purchase completion, receipt synchronization and customer-info updates. The
small native `KaloProPlugin.swift` helper only opens Apple's subscription manager.
There is no second StoreKit purchase observer or purchase implementation.

1. Create a RevenueCat project named **Kalo** and add an **App Store** app with
   bundle ID `com.ahmaduwaida.kalo`.
2. Connect the App Store credentials requested by RevenueCat in its dashboard.
   Keep Apple private keys and RevenueCat secret keys out of the app and Git.
3. Create/import these auto-renewable products in a single App Store subscription
   group, at the same service level. Choose prices in App Store Connect when ready:

   | Product ID | Duration |
   | --- | --- |
   | `com.ahmaduwaida.kalo.pro.monthly` | 1 month |
   | `com.ahmaduwaida.kalo.pro.yearly` | 1 year |

4. Create a RevenueCat entitlement with identifier **`pro`**, and attach **both**
   products to it. Buying a product without the `pro` entitlement does not unlock
   Kalo Pro.
5. Create an Offering (for example **`default`**), attach the monthly product to
   the **Monthly** package and the yearly product to the **Annual** package, and
   make it the current/default Offering.
6. Copy the **public Apple SDK key** (`appl_...`) from RevenueCat's API Keys page
   into the local `.env` file:

   ```dotenv
   VITE_REVENUECAT_IOS_API_KEY="appl_YOUR_PUBLIC_APPLE_SDK_KEY"
   ```

   Only this public SDK key is bundled. Vite rejects other key types before
   building. Never use a RevenueCat secret API key (`sk_...`) or Apple private key
   here. The key is a build-time setting: restart development or rebuild and sync
   after changing it. Set the same public key in the build environment if building
   on another machine or hosting service.
7. Run `npm run ios:sync`, then run the app in Xcode. Apple product metadata,
   agreements, banking/tax setup and review are still required for real payments.
   RevenueCat does not remove Apple's distribution or purchase requirements.

Without the public key, the app makes no RevenueCat configuration or purchase
requests, shows plans as unavailable, and keeps photo estimates and logging usable.
There is no pretend paid account, hardcoded production price, web checkout or
localStorage unlock switch.

RevenueCat references:
- https://www.revenuecat.com/docs/getting-started/installation/capacitor
- https://www.revenuecat.com/docs/offerings/overview
- https://www.revenuecat.com/docs/getting-started/restoring-purchases

## Identity and entitlement handling

The SDK generates an anonymous customer ID and persists it between app launches.
Kalo does not send emails, profile data, meal photos/history or Gemini keys to
RevenueCat. A reinstall or second device can restore Apple purchases through
**Restore purchases**; configure RevenueCat's restore/transfer behavior for this
anonymous-user model. There is no Kalo account-based cross-platform sync.

Only an active **`pro`** entitlement for one of the two known products unlocks the
feature. Trusted-entitlement verification is enabled; unverified or failed
responses do not grant access. Current-offering packages provide localized prices
and billing periods. Cancellation and pending approval do not create an unlock.

The app reads SDK customer info on foregrounding, entitlement update callbacks,
and before generating or adding suggestions. RevenueCat controls customer-info
caching and offline behavior, so server-side changes are subject to SDK refresh
behavior. Expiry checks also trigger a refresh. Local backups cannot restore a
paid entitlement. Deleting meal history does not cancel a subscription.

## Testing

- Unit tests mock the official SDK to cover configuration, active/missing/failed
  entitlements, prices/packages, purchase outcomes, restores and update listeners.
  They do not charge money or verify a live RevenueCat project.
- Once dashboard setup is complete, test with an Apple sandbox account/TestFlight
  or RevenueCat's documented StoreKit testing setup. Test both plans, cancellation,
  pending approval, restore after reinstall, expiry, refunds and revocation.
- Confirm purchases appear under the anonymous customer in RevenueCat and activate
  `pro`. Verify that free scans/logging remain usable and suggestions change totals
  only after explicitly adding a food.
- Complete the App Store privacy disclosures for the RevenueCat SDK before release,
  and test real product metadata with StoreKit Configuration set to **None**.
