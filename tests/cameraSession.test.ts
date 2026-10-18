import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { openCameraStream } from '../src/services/cameraSession';

const original = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
afterEach(() => { if (original) Object.defineProperty(globalThis, 'navigator', original); else Reflect.deleteProperty(globalThis, 'navigator'); });
test('a late camera permission grant is disposed when its screen has already closed', async () => {
  let grant!: (stream: MediaStream) => void;
  let stops = 0;
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { mediaDevices: { getUserMedia: () => new Promise(resolve => { grant = resolve; }) } } });
  const controller = new AbortController();
  const pending = openCameraStream(controller.signal);
  const rejection = assert.rejects(pending, { name: 'AbortError' });
  controller.abort(); await rejection;
  grant({ getTracks: () => [{ stop: () => stops++ }] } as unknown as MediaStream);
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(stops, 1);
});
test('camera preview uses bounded rear-camera constraints and propagates permission errors', async () => {
  const failure = new DOMException('Denied', 'NotAllowedError');
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { mediaDevices: { getUserMedia: async (constraints: MediaStreamConstraints) => {
    assert.deepEqual(constraints, { audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } } });
    throw failure;
  } } } });
  await assert.rejects(openCameraStream(new AbortController().signal), failure);
});
