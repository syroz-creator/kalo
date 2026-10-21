import { Capacitor } from '@capacitor/core';
import { withRequestDeadline } from './requestDeadline';
import { UserFacingError } from '../utils/userFacingError';

import { createRevenueCatBridge } from './revenueCat';
import { proProductIds, type ProBridge, type ProProductId, type ProStatus } from './proTypes';
export { proProductIds, type ProBridge, type ProProduct, type ProProductId, type ProStatus } from './proTypes';
interface Snapshot extends ProStatus { supported: boolean; checked: boolean; }
const inactive: ProStatus = { isPro: false };
const validProduct = (value: unknown): value is ProProductId => proProductIds.includes(value as ProProductId);

// Entitlements only come from verified RevenueCat customer info. Never persist an
// unlock flag in localStorage, backups, or a client-side "upgrade" toggle.
export function createProSubscription(bridge: ProBridge | null) {
  let snapshot: Snapshot = { ...inactive, supported: !!bridge, checked: !bridge };
  let revision = 0;
  let purchaseInProgress = false;
  let refreshing: Promise<ProStatus> | undefined;
  const listeners = new Set<() => void>();
  const apply = (status: ProStatus) => {
    const active = status?.isPro === true && validProduct(status.productId);
    snapshot = {
      supported: !!bridge, checked: true, isPro: active,
      ...(active ? { productId: status.productId, expiresAt: Number.isFinite(status.expiresAt) ? status.expiresAt : undefined } : {}),
    };
    listeners.forEach(listener => listener());
  };
  const requireBridge = () => {
    if (!bridge) throw new UserFacingError('Pro subscriptions are available in the Kalo iPhone app.');
    return bridge;
  };
  const request = <T,>(operation: () => Promise<T>) => withRequestDeadline(operation, 15000);
  const refresh = (): Promise<ProStatus> => {
    if (!bridge) return Promise.resolve(inactive);
    if (refreshing) return refreshing;
    const version = revision;
    refreshing = request(() => bridge.getStatus()).then(status => {
      if (version === revision) apply(status);
      return snapshot;
    }).catch(() => {
      if (version !== revision) return snapshot;
      apply(inactive);
      throw new UserFacingError('Could not check your Pro subscription. Please try again.');
    }).finally(() => { refreshing = undefined; });
    return refreshing;
  };
  const requireActive = async () => {
    const status = await refresh();
    if (!status.isPro) throw new UserFacingError('Kalo Pro is required for meal suggestions.');
  };
  return {
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    refresh, requireActive,
    watch: (changed: () => void) => bridge?.addListener?.('entitlementsChanged', changed),
    async products() {
      try {
        const result = await request(() => requireBridge().getProducts());
        return result.products.filter(product => validProduct(product.id) && typeof product.displayPrice === 'string' && product.displayPrice.trim()
          && product.period === (product.id === proProductIds[0] ? 'month' : 'year'));
      } catch (error) {
        if (error instanceof UserFacingError) throw error;
        throw new UserFacingError('Could not load Pro plans. Check your connection and try again.');
      }
    },
    async purchase(productId: ProProductId) {
      if (!validProduct(productId)) throw new UserFacingError('This Pro plan is unavailable. Please choose another plan.');
      if (purchaseInProgress) throw new UserFacingError('A purchase is already in progress.');
      purchaseInProgress = true;
      try {
        // The Apple purchase sheet has no artificial timeout: approval may take
        // longer than a network request. StoreKit owns cancellation and pending.
        const result = await requireBridge().purchase({ productId });
        ++revision;
        apply(result);
        return result.outcome;
      } catch (error) {
        if (error instanceof UserFacingError) throw error;
        throw new UserFacingError('Could not complete the purchase. Please try again.');
      } finally { purchaseInProgress = false; }
    },
    async restore() {
      try {
        const result = await requireBridge().restore();
        ++revision; apply(result);
        return snapshot;
      } catch (error) {
        if (error instanceof UserFacingError) throw error;
        throw new UserFacingError('Could not restore purchases. Please try again.');
      }
    },
    async manage() {
      try { await requireBridge().manage(); await refresh(); }
      catch (error) {
        if (error instanceof UserFacingError) throw error;
        throw new UserFacingError('Could not open subscription management. Please try again.');
      }
    },
  };
}

export const proSubscription = createProSubscription(Capacitor.getPlatform() === 'ios'
  ? createRevenueCatBridge(import.meta.env?.VITE_REVENUECAT_IOS_API_KEY || '') : null);
