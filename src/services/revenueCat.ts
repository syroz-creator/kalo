import { registerPlugin } from '@capacitor/core';
import { ENTITLEMENT_VERIFICATION_MODE, Purchases, PURCHASES_ERROR_CODE, VERIFICATION_RESULT, type CustomerInfo, type PurchasesPackage } from '@revenuecat/purchases-capacitor';
import { proProductIds, type ProBridge, type ProStatus } from './proTypes';
import { UserFacingError } from '../utils/userFacingError';

export const proEntitlementId = 'pro';
export const isRevenueCatAppleKey = (key: string) => /^appl_[A-Za-z0-9]+$/.test(key);
const verified = (value: VERIFICATION_RESULT) => value === VERIFICATION_RESULT.VERIFIED || value === VERIFICATION_RESULT.VERIFIED_ON_DEVICE;

export function revenueCatProStatus(info: CustomerInfo): ProStatus {
  const entitlement = info.entitlements.active[proEntitlementId];
  // Check the entitlement, not just a purchased product or a local unlock flag.
  // Verification is informational in the SDK; Kalo explicitly fails closed.
  if (!entitlement?.isActive || !verified(info.entitlements.verification) || !verified(entitlement.verification)
    || !proProductIds.includes(entitlement.productIdentifier as typeof proProductIds[number])) return { isPro: false };
  return { isPro: true, productId: entitlement.productIdentifier as typeof proProductIds[number],
    ...(Number.isFinite(entitlement.expirationDateMillis) ? { expiresAt: entitlement.expirationDateMillis! } : {}) };
}

export type RevenueCatSDK = Pick<typeof Purchases, 'configure' | 'getCustomerInfo' | 'getOfferings' | 'purchasePackage' | 'restorePurchases' | 'addCustomerInfoUpdateListener' | 'removeCustomerInfoUpdateListener'>;
const management = registerPlugin<{ manage(): Promise<void> }>('KaloPro');

export function createRevenueCatBridge(apiKey: string, sdk: RevenueCatSDK = Purchases, manage: () => Promise<void> = () => management.manage()): ProBridge {
  let configuration: Promise<void> | undefined;
  const key = apiKey.trim();
  const available = isRevenueCatAppleKey(key);
  const ready = async () => {
    if (!available) throw new UserFacingError('Pro plans are not available yet. Please check back soon.');
    // SDK-managed anonymous IDs survive launches; do not use emails, profile data
    // or a shared user ID. RevenueCat owns purchase completion and receipt sync.
    if (!configuration) configuration = sdk.configure({ apiKey: key, entitlementVerificationMode: ENTITLEMENT_VERIFICATION_MODE.INFORMATIONAL }).catch(error => {
      configuration = undefined; throw error;
    });
    await configuration;
  };
  const packages = async () => {
    await ready();
    const offerings = await sdk.getOfferings();
    return (offerings.current?.availablePackages ?? []).filter(value => {
      const index = proProductIds.indexOf(value.product.identifier as typeof proProductIds[number]);
      return index !== -1 && value.product.subscriptionPeriod === (index === 0 ? 'P1M' : 'P1Y');
    });
  };
  const status = async () => {
    if (!available) return { isPro: false };
    await ready();
    return revenueCatProStatus((await sdk.getCustomerInfo()).customerInfo);
  };
  return {
    getStatus: status,
    async getProducts() {
      if (!available) return { products: [] };
      const values = await packages();
      const unique = new Map<string, PurchasesPackage>();
      for (const value of values) if (!unique.has(value.product.identifier)) unique.set(value.product.identifier, value);
      return { products: [...unique.values()].map(value => ({
        id: value.product.identifier as typeof proProductIds[number], displayPrice: value.product.priceString,
        period: value.product.identifier === proProductIds[0] ? 'month' as const : 'year' as const,
      })) };
    },
    async purchase({ productId }) {
      const selected = (await packages()).find(value => value.product.identifier === productId);
      if (!selected) throw new UserFacingError('This Pro plan is unavailable. Please choose another plan.');
      try {
        const result = await sdk.purchasePackage({ aPackage: selected });
        return { ...revenueCatProStatus(result.customerInfo), outcome: 'purchased' };
      } catch (error) {
        const failure = error as { code?: string; userCancelled?: boolean };
        if (failure?.userCancelled || failure?.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) return { ...await status(), outcome: 'cancelled' };
        if (failure?.code === PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR) return { ...await status(), outcome: 'pending' };
        throw error;
      }
    },
    async restore() { await ready(); return revenueCatProStatus((await sdk.restorePurchases()).customerInfo); },
    manage,
    async addListener(_event, listener) {
      if (!available) return { remove: async () => {} };
      await ready();
      const id = await sdk.addCustomerInfoUpdateListener(() => listener());
      return { remove: async () => { await sdk.removeCustomerInfoUpdateListener({ listenerToRemove: id }); } };
    },
  };
}
