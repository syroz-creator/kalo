import assert from 'node:assert/strict';
import { once } from 'node:events';
import { afterEach, mock, test } from 'node:test';
import { createApp } from '../server';
import { sendContactMessage } from '../src/services/contact';

afterEach(() => mock.restoreAll());
const input = { category: 'complaint' as const, message: 'مشكلة بالتصوير & calories?\nארוחה #1', replyEmail: 'person+reply@example.com', requestId: 'b0d68ac0-f9ad-46f1-9dba-5c06ca0e5377' };
const request = (body: unknown = input) => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

async function withServer(options: Parameters<typeof createApp>[0], run: (url: string) => Promise<void>) {
  const server = createApp(options).listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert(address && typeof address !== 'string');
  try { await run(`http://127.0.0.1:${address.port}/api/contact`); }
  finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
}

test('contact delivery fixes the recipient, preserves Unicode, and carries reply-to and retry identity', async () => {
  const calls: RequestInit[] = [];
  await withServer({ contact: { apiKey: 'test-private-key', fetch: async (url, init) => {
    assert.equal(url, 'https://api.resend.com/emails');
    calls.push(init!);
    return Response.json({ id: 'email-receipt' });
  } } }, async url => {
    for (let i = 0; i < 2; i++) {
      const response = await fetch(url, request({ ...input, to: 'untrusted@example.com' }));
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { success: true, id: 'email-receipt' });
    }
  });
  const payload = JSON.parse(String(calls[0].body));
  assert.deepEqual(payload.to, ['uwaidaahmad@gmail.com']);
  assert.equal(payload.text, input.message);
  assert.equal(payload.reply_to, input.replyEmail);
  assert.equal(payload.subject, 'Kalo complaint');
  assert.equal(new Headers(calls[0].headers).get('Authorization'), 'Bearer test-private-key');
  assert.equal(new Headers(calls[0].headers).get('Idempotency-Key'), new Headers(calls[1].headers).get('Idempotency-Key'));
});

test('suggestions accept an omitted reply address', async () => {
  await withServer({ contact: { apiKey: 'test-key', fetch: async (_url, init) => {
    const payload = JSON.parse(String(init!.body));
    assert.equal(payload.subject, 'Kalo suggestion');
    assert.equal(payload.reply_to, undefined);
    return Response.json({ id: 'suggestion-receipt' });
  } } }, async url => {
    assert.equal((await fetch(url, request({ category: 'suggestion', message: 'Add a shortcut', requestId: input.requestId }))).status, 200);
  });
});

test('missing delivery credentials are reported as unavailable, without a success receipt', async () => {
  await withServer({ contact: { apiKey: '', fetch: async () => { assert.fail('Must not call the provider'); } } }, async url => {
    const response = await fetch(url, request());
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { success: false });
  });
});

test('invalid message, email, and retry identifiers never reach the provider', async () => {
  await withServer({ contact: { apiKey: 'test-key', fetch: async () => { assert.fail('Must not call the provider'); } } }, async url => {
    for (const invalid of [{ message: ' ' }, { message: 'x'.repeat(2001) }, { category: 'urgent' }, { replyEmail: 'person@example.com\r\nBcc: elsewhere@example.com' }, { replyEmail: 'not-an-email' }, { requestId: '' }, { message: 10 }]) {
      assert.equal((await fetch(url, request({ ...input, ...invalid }))).status, 400);
    }
    assert.equal((await fetch(url, { ...request(), body: '{' })).status, 400);
    assert.equal((await fetch(url, request({ ...input, message: 'x'.repeat(20000) }))).status, 413);
  });
});

test('provider errors and incomplete receipts cannot become success or leak provider details', async () => {
  for (const provider of [async () => Response.json({ message: 'sensitive-provider-details' }, { status: 403 }), async () => Response.json({}), async () => { throw new Error('private-token'); }]) {
    await withServer({ contact: { apiKey: 'test-key', fetch: provider } }, async url => {
      const response = await fetch(url, request());
      assert.equal(response.status, 502);
      assert.deepEqual(await response.json(), { success: false });
    });
  }
});

test('native apps can preflight while unrelated origins are rejected', async () => {
  await withServer({ contact: { apiKey: '' } }, async url => {
    const allowed = await fetch(url, { method: 'OPTIONS', headers: { Origin: 'capacitor://localhost' } });
    assert.equal(allowed.status, 204);
    assert.equal(allowed.headers.get('Access-Control-Allow-Origin'), 'capacitor://localhost');
    const denied = await fetch(url, { ...request(), headers: { ...request().headers, Origin: 'https://unrelated.example.com' } });
    assert.equal(denied.status, 403);
  });
});

test('the public contact endpoint bounds email provider calls', async () => {
  let calls = 0;
  await withServer({ contact: { apiKey: 'test-key', fetch: async () => { calls++; return Response.json({ id: 'receipt' }); } } }, async url => {
    for (let i = 0; i < 10; i++) assert.equal((await fetch(url, request())).status, 200);
    const blocked = await fetch(url, request());
    assert.equal(blocked.status, 429);
    assert.equal(blocked.headers.get('Retry-After'), '60');
    assert.equal(calls, 10);
  });
});

test('the client posts a contact message and accepts a provider receipt', async () => {
  mock.method(globalThis, 'fetch', async (url: string | URL | Request, options: RequestInit) => {
    assert.equal(url, '/api/contact');
    assert.equal(options.method, 'POST');
    assert.deepEqual(JSON.parse(String(options.body)), input);
    return Response.json({ success: true, id: 'receipt' });
  });
  assert.equal(await sendContactMessage(input), 'receipt');
});

test('the client distinguishes unavailable delivery, validation, rate limits, and uncertain results', async () => {
  for (const [status, expected] of [[503, /not set up/], [400, /Check your message/], [429, /Wait a minute/], [502, /could not confirm/]] as const) {
    mock.method(globalThis, 'fetch', async () => Response.json({ success: false, error: 'private-provider-error' }, { status }));
    await assert.rejects(sendContactMessage(input), expected);
  }
  mock.method(globalThis, 'fetch', async () => Response.json({ success: true }));
  await assert.rejects(sendContactMessage(input), /could not confirm/);
  mock.method(globalThis, 'fetch', async () => { throw new TypeError('fetch failed'); });
  await assert.rejects(sendContactMessage(input), /message is still here/);
});
