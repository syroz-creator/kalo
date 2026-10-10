import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import { installViewport } from '../src/services/viewport';

function setupViewport(t: TestContext) {
  const properties = new Map<string, string>();
  class Field {
    matches() { return true; }
  }
  const viewport = Object.assign(new EventTarget(), { height: 873, scale: 1, offsetTop: 0 });
  const document = Object.assign(new EventTarget(), {
    activeElement: null as Field | null,
    documentElement: { clientHeight: 932, style: {
      setProperty: (name: string, value: string) => properties.set(name, value),
      removeProperty: (name: string) => properties.delete(name),
    } },
  });
  const window = Object.assign(new EventTarget(), { visualViewport: viewport });
  const globals = { document, window, HTMLElement: Field, requestAnimationFrame: () => 1, cancelAnimationFrame: () => {} };
  const previous = new Map(Object.keys(globals).map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  for (const [name, value] of Object.entries(globals)) Object.defineProperty(globalThis, name, { configurable: true, value });
  const cleanup = installViewport();
  t.after(() => {
    cleanup();
    for (const [name, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else Reflect.deleteProperty(globalThis, name);
    }
  });
  return { properties, viewport, document, window, focus: () => {
    document.activeElement = new Field();
    document.dispatchEvent(new Event('focusin'));
  } };
}

test('a Home Screen visual viewport missing the status-bar area does not override full-screen CSS', t => {
  const { properties, viewport } = setupViewport(t);
  assert.equal(properties.has('--app-height'), false);
  viewport.dispatchEvent(new Event('resize'));
  assert.equal(properties.has('--app-height'), false);
});

test('focusing an input does not mistake the status-bar gap for the keyboard', t => {
  const { properties, focus } = setupViewport(t);
  focus();
  assert.equal(properties.has('--app-height'), false);
});

test('the keyboard reduces height while editing and dismissal restores full-screen CSS', t => {
  const { properties, viewport, document, focus } = setupViewport(t);
  focus();
  viewport.height = 500;
  viewport.dispatchEvent(new Event('resize'));
  assert.equal(properties.get('--app-height'), '500px');
  document.activeElement = null;
  document.dispatchEvent(new Event('focusout'));
  assert.equal(properties.has('--app-height'), false);
});

test('restoring the app clears a stale keyboard height even if the input remains focused', t => {
  const { properties, viewport, window, focus } = setupViewport(t);
  focus();
  viewport.height = 500;
  viewport.dispatchEvent(new Event('resize'));
  assert.equal(properties.get('--app-height'), '500px');
  viewport.height = 873;
  window.dispatchEvent(new Event('pageshow'));
  assert.equal(properties.has('--app-height'), false);
});
