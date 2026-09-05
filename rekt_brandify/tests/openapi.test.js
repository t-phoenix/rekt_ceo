import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { buildOpenApiDocument } from '../server/openapi.js';
import { startTestServer, stopTestServer, jsonFetch } from './helpers.js';

const PAID_PATHS = [
  '/api/sessions/start',
  '/api/generate',
  '/api/sessions/rate',
  '/api/captions/suggest',
  '/api/captions/rate',
  '/api/cmo/research/topics',
  '/api/cmo/research/social-pulse',
  '/api/cmo/research/news-events',
  '/api/cmo/research/intel-pack',
  '/api/cmo/content/curate',
  '/api/cmo/content/select-template',
  '/api/cmo/content/brandify',
  '/api/cmo/content/caption',
  '/api/cmo/content/day-package',
];

describe('OpenAPI document', () => {
  it('buildOpenApiDocument includes required discovery fields', () => {
    const doc = buildOpenApiDocument({
      publicOrigin: 'https://brandify.example.com',
      contactEmail: 'test@example.com',
    });

    assert.equal(doc.openapi, '3.1.0');
    assert.ok(doc.info.title.includes('Rekt CEO'));
    assert.ok(doc.info['x-guidance']);
    assert.equal(doc.info.contact.email, 'test@example.com');
    assert.equal(doc.servers[0].url, 'https://brandify.example.com');

    for (const path of PAID_PATHS) {
      const post = doc.paths[path]?.post;
      assert.ok(post, `missing POST ${path}`);
      assert.ok(post['x-payment-info'], `missing x-payment-info on ${path}`);
      assert.ok(post.responses['402'], `missing 402 response on ${path}`);
      assert.ok(post.requestBody, `missing requestBody on ${path}`);
      assert.ok(post.responses['200'], `missing 200 response on ${path}`);
    }

    assert.ok(doc.paths['/api/templates']?.get?.['x-payment-info']);
    assert.ok(doc.info['x-guidance'].includes('/api/cmo/research/intel-pack'));
    assert.ok(doc.info['x-guidance'].includes('/api/captions/suggest'));

    const startBody = doc.paths['/api/sessions/start'].post.requestBody.content['multipart/form-data'];
    assert.ok(startBody?.schema?.properties?.image);
    assert.ok(startBody.schema.required.includes('image'));

    const captionBody = doc.paths['/api/captions/suggest'].post.requestBody.content['multipart/form-data'];
    assert.ok(captionBody?.schema?.properties?.template_image);
    assert.ok(captionBody.schema.required.includes('template_image'));

    assert.deepEqual(doc.paths['/health'].get.security, []);
    assert.deepEqual(doc.paths['/api/templates/{templateId}/variations'].get.security, []);
    assert.equal(doc.paths['/api/templates/{templateId}/variations'].get.parameters[0].required, true);
  });

  it('GET /openapi.json serves the live document', async () => {
    const { baseUrl } = await startTestServer({ enablePayment: false });

    try {
      const { res, body } = await jsonFetch(baseUrl, '/openapi.json');
      assert.equal(res.status, 200);
      assert.equal(body.openapi, '3.1.0');
      assert.ok(body.paths['/api/sessions/start']);
      assert.ok(body.paths['/health']);
      assert.ok(body.paths['/api/templates/{templateId}/variations']);
    } finally {
      await stopTestServer();
    }
  });
});

describe('OpenAPI x-payment-info prices', () => {
  it('reflects env overrides', () => {
    const prev = {
      start: process.env.X402_PRICE_SESSION_START,
      generate: process.env.X402_PRICE_GENERATE,
      rate: process.env.X402_PRICE_RATE,
      captionSuggest: process.env.X402_PRICE_CAPTION_SUGGEST,
      captionRate: process.env.X402_PRICE_CAPTION_RATE,
    };

    process.env.X402_PRICE_SESSION_START = '0.25';
    process.env.X402_PRICE_GENERATE = '0.55';
    process.env.X402_PRICE_RATE = '0.02';
    process.env.X402_PRICE_CAPTION_SUGGEST = '0.12';
    process.env.X402_PRICE_CAPTION_RATE = '0.02';

    try {
      const doc = buildOpenApiDocument();
      assert.equal(doc.paths['/api/sessions/start'].post['x-payment-info'].price.amount, '0.25');
      assert.equal(doc.paths['/api/generate'].post['x-payment-info'].price.amount, '0.55');
      assert.equal(doc.paths['/api/sessions/rate'].post['x-payment-info'].price.amount, '0.02');
      assert.equal(doc.paths['/api/captions/suggest'].post['x-payment-info'].price.amount, '0.12');
      assert.equal(doc.paths['/api/captions/rate'].post['x-payment-info'].price.amount, '0.02');
    } finally {
      if (prev.start === undefined) delete process.env.X402_PRICE_SESSION_START;
      else process.env.X402_PRICE_SESSION_START = prev.start;
      if (prev.generate === undefined) delete process.env.X402_PRICE_GENERATE;
      else process.env.X402_PRICE_GENERATE = prev.generate;
      if (prev.rate === undefined) delete process.env.X402_PRICE_RATE;
      else process.env.X402_PRICE_RATE = prev.rate;
      if (prev.captionSuggest === undefined) delete process.env.X402_PRICE_CAPTION_SUGGEST;
      else process.env.X402_PRICE_CAPTION_SUGGEST = prev.captionSuggest;
      if (prev.captionRate === undefined) delete process.env.X402_PRICE_CAPTION_RATE;
      else process.env.X402_PRICE_CAPTION_RATE = prev.captionRate;
    }
  });
});
