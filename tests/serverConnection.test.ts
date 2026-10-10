import assert from 'node:assert/strict';
import { afterEach, mock, test } from 'node:test';
import { Capacitor } from '@capacitor/core';
import { apiUrl, checkServer, defaultServer, getServerUrl, normalizeServerUrl, saveServerUrl } from '../src/services/serverConnection';

afterEach(() => mock.restoreAll());

test('server addresses must be HTTPS origins without embedded credentials', () => {
  assert.equal(normalizeServerUrl(' https://example.com/ '), 'https://example.com');
  for (const value of ['example.com', 'http://example.com', 'https://user:secret@example.com', 'https://example.com/api', 'https://example.com?key=secret', 'https://example.com/#key']) {
    assert.throws(() => normalizeServerUrl(value));
  }
});

test('web requests stay same-origin and native requests use the saved hosted server', context => {
  const stored = new Map<string, string>();
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  context.after(() => {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  });
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => stored.get(key) ?? null,
    setItem: (key: string, value: string) => stored.set(key, value),
  } });
  assert.equal(getServerUrl(), defaultServer);
  mock.method(Capacitor, 'isNativePlatform', () => false);
  assert.equal(apiUrl('/api/analyze-meal'), '/api/analyze-meal');
  mock.method(Capacitor, 'isNativePlatform', () => true);
  assert.equal(apiUrl('/api/analyze-meal'), `${defaultServer}/api/analyze-meal`);
  saveServerUrl('https://new-server.example/');
  assert.equal(apiUrl('/api/analyze-meal'), 'https://new-server.example/api/analyze-meal');
  stored.set('kalo-api-server', 'http://invalid.example');
  assert.equal(getServerUrl(), defaultServer);
});

test('connection checks distinguish a static site, missing key and configured API', async () => {
  mock.method(globalThis, 'fetch', async () => new Response('Not Found', { status: 404 }));
  await assert.rejects(checkServer(defaultServer), /Static Site/);
  mock.method(globalThis, 'fetch', async () => Response.json({ status: 'ok', hasGeminiKey: false }));
  await assert.rejects(checkServer(defaultServer), /GEMINI_API_KEY/);
  mock.method(globalThis, 'fetch', async () => Response.json({ status: 'wrong', hasGeminiKey: true }));
  await assert.rejects(checkServer(defaultServer), /not a Kalo/);
  mock.method(globalThis, 'fetch', async () => Response.json({ status: 'ok', hasGeminiKey: true }));
  await checkServer(defaultServer);
});
