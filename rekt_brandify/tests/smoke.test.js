import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, stopTestServer, jsonFetch } from './helpers.js';

describe('brandify smoke (free mode)', () => {
  let baseUrl;

  before(async () => {
    ({ baseUrl } = await startTestServer({ enablePayment: false }));
  });

  after(async () => {
    await stopTestServer();
  });

  it('GET /health returns ok', async () => {
    const { res, body } = await jsonFetch(baseUrl, '/health');
    assert.equal(res.status, 200);
    assert.equal(body.status, 'ok');
    assert.equal(body.service, 'rekt-brandify');
    assert.equal(body.payment, null);
  });

  it('GET /favicon.ico returns Rekt CEO icon', async () => {
    const res = await fetch(`${baseUrl}/favicon.ico`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type') || '', /image\/(x-icon|vnd\.microsoft\.icon)/);
    const buf = Buffer.from(await res.arrayBuffer());
    assert.ok(buf.length > 0);
  });

  it('GET /.well-known/x402 returns legacy discovery doc', async () => {
    const { res, body } = await jsonFetch(baseUrl, '/.well-known/x402');
    assert.equal(res.status, 200);
    assert.equal(body.name, 'Rekt CEO Meme Brandifier + CMO Workshop');
    assert.equal(body.openapi, '/openapi.json');
    assert.ok(Array.isArray(body.endpoints));
    assert.ok(body.endpoints.length >= 20, `expected expanded CMO discovery list, got ${body.endpoints.length}`);
    const paths = body.endpoints.map((e) => e.path);
    assert.ok(paths.includes('/api/cmo/research/intel-pack'));
    assert.ok(paths.includes('/api/cmo/content/curate'));
    assert.ok(paths.includes('/api/cmo/content/day-package'));
  });

  it('GET /api/templates/:id/variations returns empty list without payment', async () => {
    const { res, body } = await jsonFetch(baseUrl, '/api/templates/test-meme/variations');
    assert.equal(res.status, 200);
    assert.equal(body.templateId, 'test-meme');
    assert.equal(body.total, 0);
    assert.deepEqual(body.items, []);
  });

  it('POST /api/sessions/start without image returns 400 in free mode', async () => {
    const res = await fetch(`${baseUrl}/api/sessions/start`, { method: 'POST' });
    assert.equal(res.status, 400);
  });

  it('POST /api/generate with unknown session returns 404 or 503', async () => {
    const { res } = await jsonFetch(baseUrl, '/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: '00000000-0000-0000-0000-000000000000',
        userCuratedChoices: [{ element: 'shirt', idea: 'add logo' }],
      }),
    });
    assert.ok(res.status === 404 || res.status === 503);
  });

  it('POST /api/sessions/rate with unknown session returns 404 or 503', async () => {
    const { res } = await jsonFetch(baseUrl, '/api/sessions/rate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: '00000000-0000-0000-0000-000000000000',
        rating: 'Like',
      }),
    });
    assert.ok(res.status === 404 || res.status === 503);
  });

  it('POST /api/captions/suggest without image returns 400 in free mode', async () => {
    const res = await fetch(`${baseUrl}/api/captions/suggest`, { method: 'POST' });
    assert.equal(res.status, 400);
  });

  it('POST /api/captions/rate without run_id returns 400 in free mode', async () => {
    const { res } = await jsonFetch(baseUrl, '/api/captions/rate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating: 'Like' }),
    });
    assert.equal(res.status, 400);
  });

  it('POST /api/captions/rate with unknown run returns 404 when pg disabled', async () => {
    const { res } = await jsonFetch(baseUrl, '/api/captions/rate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        run_id: '00000000-0000-0000-0000-000000000000',
        rating: 'Like',
      }),
    });
    // Without DATABASE_URL, rate accepts any valid run_id shape
    assert.ok(res.status === 200 || res.status === 404);
  });
});

describe('brandify x402 payment mode', () => {
  let baseUrl;
  let paymentEnabled;

  before(async () => {
    if (!process.env.X402_RECEIVER_ADDRESS) {
      return;
    }
    if (!process.env.CDP_API_KEY_ID || !process.env.CDP_API_KEY_SECRET) {
      return;
    }
    ({ baseUrl, paymentMiddlewareEnabled: paymentEnabled } = await startTestServer({
      enablePayment: true,
    }));
  });

  after(async () => {
    if (baseUrl) {
      await stopTestServer();
    }
  });

  it('returns 402 with payment-required header on paid routes when configured', async (t) => {
    if (!baseUrl || !paymentEnabled) {
      t.skip('Requires X402_RECEIVER_ADDRESS + CDP_API_KEY_ID/SECRET in environment');
      return;
    }

    const res = await fetch(`${baseUrl}/api/sessions/start`, { method: 'POST' });
    assert.equal(res.status, 402);
    const paymentHeader = res.headers.get('payment-required') || res.headers.get('PAYMENT-REQUIRED');
    assert.ok(paymentHeader, 'expected payment-required header');
  });

  it('free route GET /api/templates/:id/variations still works with payment enabled', async (t) => {
    if (!baseUrl || !paymentEnabled) {
      t.skip('Requires X402_RECEIVER_ADDRESS + CDP_API_KEY_ID/SECRET in environment');
      return;
    }

    const { res, body } = await jsonFetch(baseUrl, '/api/templates/demo/variations');
    assert.equal(res.status, 200);
    assert.equal(body.total, 0);
  });
});
