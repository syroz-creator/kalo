import assert from 'node:assert/strict';
import test from 'node:test';
import { createProSubscription, proProductIds, type ProBridge, type ProStatus } from '../src/services/proSubscription';

const active: ProStatus = { isPro: true, productId: proProductIds[0], expiresAt: Date.now() + 86400000 };
function native(overrides: Partial<ProBridge> = {}): ProBridge {
  return {
    getStatus: async () => ({ isPro: false }), getProducts: async () => ({ products: [] }),
    purchase: async () => ({ ...active, outcome: 'purchased' }), restore: async () => active, manage: async () => {}, ...overrides,
  };
}

test('web clients never unlock Pro and cannot fabricate a subscription through local storage', async () => {
  const service = createProSubscription(null);
  assert.deepEqual(await service.refresh(), { isPro: false });
  assert.equal(service.getSnapshot().supported, false);
  await assert.rejects(service.requireActive(), /Kalo Pro is required/);
  await assert.rejects(service.purchase(proProductIds[0]), /iPhone app/);
});

test('only an active entitlement for a known Kalo product unlocks suggestions', async () => {
  for (const status of [{ isPro: false }, { isPro: true }, { isPro: true, productId: 'other.product' }, { isPro: 'true', productId: proProductIds[0] }, active]) {
    const service = createProSubscription(native({ getStatus: async () => status as ProStatus }));
    await service.refresh();
    assert.equal(service.getSnapshot().isPro, status === active);
  }
});

test('cancellation and pending approval leave free users locked; verified purchase and restore unlock', async () => {
  for (const outcome of ['cancelled', 'pending'] as const) {
    const service = createProSubscription(native({ purchase: async () => ({ isPro: false, outcome }) }));
    assert.equal(await service.purchase(proProductIds[0]), outcome);
    assert.equal(service.getSnapshot().isPro, false);
  }
  const service = createProSubscription(native());
  assert.equal(await service.purchase(proProductIds[0]), 'purchased');
  assert.equal(service.getSnapshot().isPro, true);
  const restored = createProSubscription(native());
  assert.equal((await restored.restore()).isPro, true);
  assert.equal(restored.getSnapshot().productId, proProductIds[0]);
});

test('expiry, revocation, empty restores and failed status checks remove access', async () => {
  let current = active;
  const service = createProSubscription(native({ getStatus: async () => current, restore: async () => ({ isPro: false }) }));
  await service.refresh();
  assert.equal(service.getSnapshot().isPro, true);
  current = { isPro: false };
  await assert.rejects(service.requireActive(), /Kalo Pro/);
  assert.equal(service.getSnapshot().isPro, false);
  current = active;
  await service.refresh(); await service.restore();
  assert.equal(service.getSnapshot().isPro, false);
  const failing = createProSubscription(native({ getStatus: async () => { throw new Error('private StoreKit error'); } }));
  await failing.purchase(proProductIds[0]);
  await assert.rejects(failing.refresh(), error => /Could not check/.test(String(error)) && !String(error).includes('private'));
  assert.equal(failing.getSnapshot().isPro, false);
});

test('a slow pre-purchase status result cannot overwrite a newly verified purchase', async () => {
  let resolve!: (status: ProStatus) => void;
  let calls = 0;
  const service = createProSubscription(native({ getStatus: () => { calls++; return new Promise(done => { resolve = done; }); } }));
  const first = service.refresh(), second = service.refresh();
  assert.equal(calls, 1);
  await service.purchase(proProductIds[0]);
  resolve({ isPro: false });
  await Promise.all([first, second]);
  assert.equal(service.getSnapshot().isPro, true);
});

test('duplicate taps do not create a second Apple purchase and unknown products are rejected', async () => {
  let resolve!: (value: Awaited<ReturnType<ProBridge['purchase']>>) => void;
  let calls = 0;
  const service = createProSubscription(native({ purchase: () => { calls++; return new Promise(done => { resolve = done; }); } }));
  const first = service.purchase(proProductIds[0]);
  await assert.rejects(service.purchase(proProductIds[0]), /already in progress/);
  assert.equal(calls, 1);
  resolve({ ...active, outcome: 'purchased' }); await first;
  await assert.rejects(service.purchase('other.product' as any), /unavailable/);
});

test('prices come from Apple and invalid products or mismatched billing periods are ignored', async () => {
  const service = createProSubscription(native({ getProducts: async () => ({ products: [
    { id: proProductIds[0], displayPrice: '₪17.90', period: 'month' },
    { id: proProductIds[1], displayPrice: '₪149.90', period: 'year' },
    { id: proProductIds[0], displayPrice: '$1', period: 'year' },
    { id: 'other.product', displayPrice: '$1', period: 'month' },
  ] as any }) }));
  assert.deepEqual((await service.products()).map(product => product.displayPrice), ['₪17.90', '₪149.90']);
});
