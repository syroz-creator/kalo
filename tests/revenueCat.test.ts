import assert from 'node:assert/strict';
import test from 'node:test';
import { ENTITLEMENT_VERIFICATION_MODE, PURCHASES_ERROR_CODE, VERIFICATION_RESULT, type CustomerInfo, type PurchasesPackage } from '@revenuecat/purchases-capacitor';
import { createRevenueCatBridge, isRevenueCatAppleKey, revenueCatProStatus, type RevenueCatSDK } from '../src/services/revenueCat';
import { proProductIds } from '../src/services/proTypes';

const key = 'appl_publictestkey';
function info(active = true, overrides: object = {}, verification = VERIFICATION_RESULT.VERIFIED): CustomerInfo {
  return { entitlements: { verification, active: active ? { pro: {
    isActive: true, productIdentifier: proProductIds[0], expirationDateMillis: Date.now() + 86400000, verification, ...overrides,
  } } : {} } } as CustomerInfo;
}
const monthly = { identifier: '$rc_monthly', product: { identifier: proProductIds[0], priceString: '₪17.90', subscriptionPeriod: 'P1M' } } as PurchasesPackage;
const yearly = { identifier: '$rc_annual', product: { identifier: proProductIds[1], priceString: '₪149.90', subscriptionPeriod: 'P1Y' } } as PurchasesPackage;
function sdk(overrides: Partial<RevenueCatSDK> = {}): RevenueCatSDK {
  return {
    configure: async () => {}, getCustomerInfo: async () => ({ customerInfo: info() }),
    getOfferings: async () => ({ current: { availablePackages: [monthly, yearly] } } as any),
    purchasePackage: async () => ({ customerInfo: info() } as any), restorePurchases: async () => ({ customerInfo: info() }),
    addCustomerInfoUpdateListener: async () => 'listener-1', removeCustomerInfoUpdateListener: async () => ({ wasRemoved: true }), ...overrides,
  };
}

test('missing or secret keys never configure RevenueCat or expose purchase plans', async () => {
  for (const value of ['', 'sk_secret', 'goog_otherplatform', 'appl_']) {
    assert.equal(isRevenueCatAppleKey(value), false);
    const bridge = createRevenueCatBridge(value, sdk({ configure: async () => { assert.fail('Must not configure'); } }));
    assert.deepEqual(await bridge.getStatus(), { isPro: false });
    assert.deepEqual(await bridge.getProducts(), { products: [] });
    await assert.rejects(bridge.restore(), /not available yet/);
  }
});

test('configure runs once with anonymous identity and verification; concurrent callers share setup', async () => {
  const configurations: unknown[] = [];
  const bridge = createRevenueCatBridge(key, sdk({ configure: async options => { configurations.push(options); } }));
  await Promise.all([bridge.getStatus(), bridge.getProducts(), bridge.getStatus()]);
  assert.deepEqual(configurations, [{ apiKey: key, entitlementVerificationMode: ENTITLEMENT_VERIFICATION_MODE.INFORMATIONAL }]);
});

test('failed SDK configuration is retryable', async () => {
  let calls = 0;
  const bridge = createRevenueCatBridge(key, sdk({ configure: async () => { if (++calls === 1) throw new Error('Offline'); } }));
  await assert.rejects(bridge.getStatus());
  assert.equal((await bridge.getStatus()).isPro, true);
  assert.equal(calls, 2);
});

test('only verified, active pro entitlement with a supported product unlocks Pro', () => {
  assert.equal(revenueCatProStatus(info()).isPro, true);
  assert.equal(revenueCatProStatus(info(true, {}, VERIFICATION_RESULT.VERIFIED_ON_DEVICE)).isPro, true);
  for (const value of [info(false), info(true, { isActive: false }), info(true, { productIdentifier: 'other.product' }),
    info(true, {}, VERIFICATION_RESULT.FAILED), info(true, {}, VERIFICATION_RESULT.NOT_REQUESTED),
    info(true, { verification: VERIFICATION_RESULT.FAILED })]) assert.equal(revenueCatProStatus(value).isPro, false);
  const other = info();
  (other.entitlements.active as any).other = other.entitlements.active.pro;
  delete (other.entitlements.active as any).pro;
  assert.equal(revenueCatProStatus(other).isPro, false);
});

test('current offering supplies localized prices; unknown and mismatched products are hidden', async () => {
  const bridge = createRevenueCatBridge(key, sdk({ getOfferings: async () => ({ current: { availablePackages: [monthly, yearly, monthly,
    { ...monthly, product: { ...monthly.product, subscriptionPeriod: 'P1Y' } },
    { ...monthly, product: { ...monthly.product, identifier: 'unrelated' } },
  ] } } as any) }));
  assert.deepEqual(await bridge.getProducts(), { products: [
    { id: proProductIds[0], displayPrice: '₪17.90', period: 'month' },
    { id: proProductIds[1], displayPrice: '₪149.90', period: 'year' },
  ] });
  const empty = createRevenueCatBridge(key, sdk({ getOfferings: async () => ({ current: null } as any) }));
  assert.deepEqual(await empty.getProducts(), { products: [] });
  await assert.rejects(empty.purchase({ productId: proProductIds[0] }), /unavailable/);
});

test('purchase uses the selected RevenueCat package and the returned entitlement', async () => {
  const bridge = createRevenueCatBridge(key, sdk({ purchasePackage: async options => {
    assert.equal(options.aPackage, yearly);
    return { customerInfo: info(true, { productIdentifier: proProductIds[1] }) } as any;
  } }));
  const result = await bridge.purchase({ productId: proProductIds[1] });
  assert.equal(result.outcome, 'purchased'); assert.equal(result.isPro, true); assert.equal(result.productId, proProductIds[1]);
  const unattached = createRevenueCatBridge(key, sdk({ purchasePackage: async () => ({ customerInfo: info(false) } as any) }));
  assert.equal((await unattached.purchase({ productId: proProductIds[0] })).isPro, false);
});

test('cancelled and pending purchases do not unlock; other purchase errors propagate to friendly handling', async () => {
  for (const [code, outcome] of [[PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR, 'cancelled'], [PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR, 'pending']]) {
    const bridge = createRevenueCatBridge(key, sdk({ getCustomerInfo: async () => ({ customerInfo: info(false) }), purchasePackage: async () => { throw { code }; } }));
    assert.deepEqual(await bridge.purchase({ productId: proProductIds[0] }), { isPro: false, outcome });
  }
  const failure = new Error('private SDK failure');
  const bridge = createRevenueCatBridge(key, sdk({ purchasePackage: async () => { throw failure; } }));
  await assert.rejects(bridge.purchase({ productId: proProductIds[0] }), error => error === failure);
});

test('restores and customer-info updates use RevenueCat, while management uses the Apple sheet', async () => {
  let updated = 0, managed = 0;
  const bridge = createRevenueCatBridge(key, sdk({
    restorePurchases: async () => ({ customerInfo: info(false) }),
    addCustomerInfoUpdateListener: async callback => { callback(info(false)); return 'listener-1'; },
    removeCustomerInfoUpdateListener: async options => { assert.equal(options.listenerToRemove, 'listener-1'); return { wasRemoved: true }; },
  }), async () => { managed++; });
  assert.equal((await bridge.restore()).isPro, false);
  const listener = await bridge.addListener!('entitlementsChanged', () => { updated++; });
  assert.equal(updated, 1); await listener.remove();
  await bridge.manage(); assert.equal(managed, 1);
});
