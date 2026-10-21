import Capacitor
import StoreKit
import UIKit

// RevenueCat owns all purchases, receipt handling and entitlement updates.
// This helper only opens Apple's subscription management sheet.
@objc(KaloProPlugin)
public class KaloProPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "KaloProPlugin"
    public let jsName = "KaloPro"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "manage", returnType: CAPPluginReturnPromise)
    ]

    @objc func manage(_ call: CAPPluginCall) {
        Task { @MainActor in
            guard let scene = bridge?.viewController?.view.window?.windowScene else {
                call.reject("Subscription management is unavailable."); return
            }
            do { try await AppStore.showManageSubscriptions(in: scene); call.resolve() }
            catch { call.reject("Could not open subscription management.") }
        }
    }
}
