import assert from 'node:assert/strict';
import test from 'node:test';
import { watchCalendarDay } from '../src/services/calendarDay';

test('resuming after midnight advances the journal once and cleans up its listeners', () => {
  const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const documentDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const windowEvents = new EventTarget();
  const documentEvents = Object.assign(new EventTarget(), { visibilityState: 'visible' });
  Object.defineProperty(globalThis, 'window', { configurable: true, value: windowEvents });
  Object.defineProperty(globalThis, 'document', { configurable: true, value: documentEvents });
  let day = '2026-10-19';
  const changes: string[][] = [];
  const cleanup = watchCalendarDay((next, previous) => changes.push([next, previous]), () => day);
  try {
    assert.deepEqual(changes, []);
    documentEvents.visibilityState = 'hidden'; day = '2026-10-20';
    documentEvents.dispatchEvent(new Event('visibilitychange'));
    assert.deepEqual(changes, []);
    documentEvents.visibilityState = 'visible';
    documentEvents.dispatchEvent(new Event('visibilitychange'));
    windowEvents.dispatchEvent(new Event('pageshow'));
    assert.deepEqual(changes, [['2026-10-20', '2026-10-19']]);
    cleanup(); day = '2026-10-21'; windowEvents.dispatchEvent(new Event('pageshow'));
    assert.equal(changes.length, 1);
  } finally {
    cleanup();
    if (windowDescriptor) Object.defineProperty(globalThis, 'window', windowDescriptor); else Reflect.deleteProperty(globalThis, 'window');
    if (documentDescriptor) Object.defineProperty(globalThis, 'document', documentDescriptor); else Reflect.deleteProperty(globalThis, 'document');
  }
});
