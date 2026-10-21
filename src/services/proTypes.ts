import type { PluginListenerHandle } from '@capacitor/core';

export const proProductIds = ['com.ahmaduwaida.kalo.pro.monthly', 'com.ahmaduwaida.kalo.pro.yearly'] as const;
export type ProProductId = typeof proProductIds[number];
export interface ProProduct { id: ProProductId; displayPrice: string; period: 'month' | 'year'; }
export interface ProStatus { isPro: boolean; productId?: ProProductId; expiresAt?: number; }
export interface ProBridge {
  getStatus(): Promise<ProStatus>;
  getProducts(): Promise<{ products: ProProduct[] }>;
  purchase(options: { productId: ProProductId }): Promise<ProStatus & { outcome: 'purchased' | 'cancelled' | 'pending' }>;
  restore(): Promise<ProStatus>;
  manage(): Promise<void>;
  addListener?(event: 'entitlementsChanged', listener: () => void): Promise<PluginListenerHandle>;
}
