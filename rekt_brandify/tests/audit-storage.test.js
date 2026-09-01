import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { isPgEnabled, query } = await import('../server/db/pg.js');
const { createSession } = await import('../server/db/brandifySessions.js');
const {
  insertSessionStage,
  appendSessionPayment,
  listSessionStages,
} = await import('../server/db/sessionStages.js');
const {
  createCaptionRun,
  insertCaptionStage,
  completeCaptionRun,
  updateCaptionRunPayment,
  listCaptionStages,
} = await import('../server/db/captionRuns.js');
const { insertApiRequestLog, getApiRequestLog } = await import('../server/db/auditLog.js');
const {
  capturePaymentMeta,
  summarizeRequestBody,
  summarizeResponseBody,
} = await import('../server/utils/audit.js');

describe('audit storage helpers', () => {
  it('capturePaymentMeta extracts route and price', () => {
    const req = {
      get(name) {
        if (name === 'x-payment') return 'test-payment-header';
        return null;
      },
    };

    const meta = capturePaymentMeta(req, 'POST /api/sessions/start');
    assert.equal(meta.route, 'POST /api/sessions/start');
    assert.equal(meta.payment_header_present, true);
    assert.equal(meta.payment_header, 'test-payment-header');
    assert.ok(meta.captured_at);
  });

  it('summarize helpers truncate large payloads', () => {
    const body = { context: 'x'.repeat(5000) };
    const summary = summarizeRequestBody(body, { maxString: 100 });
    assert.ok(String(summary.context).length <= 101);

    const response = summarizeResponseBody({ data: 'y'.repeat(5000) }, { maxString: 200 });
    assert.equal(response.truncated, true);
    assert.ok(response.preview);
  });
});

describe('audit storage database round-trip', () => {
  it('persists session stages, payments, and API logs', async (t) => {
    if (!isPgEnabled()) {
      t.skip('DATABASE_URL not set');
      return;
    }

    const sessionId = uuidv4();
    const runId = uuidv4();
    let logId = null;

    try {
      await createSession({
        sessionId,
        originalImageUrl: 'https://example.com/original.png',
        templateId: 'audit-test',
      });

      await insertSessionStage({
        sessionId,
        stage: 'vision_strategy',
        attempt: 1,
        model: 'gpt-4o',
        latencyMs: 120,
        input: { image_url: 'https://example.com/original.png', custom_target: null },
        output: { elements: [{ name: 'hat', type: 'existing', ideas: ['$CEO'] }] },
      });

      const paymentMeta = {
        route: 'POST /api/sessions/start',
        price_usd: '0.19',
        payment_header_present: false,
        captured_at: new Date().toISOString(),
      };
      await appendSessionPayment(sessionId, paymentMeta);

      const stages = await listSessionStages(sessionId);
      assert.equal(stages.length, 1);
      assert.equal(stages[0].stage, 'vision_strategy');
      assert.ok(stages[0].input?.image_url);

      const sessionRow = await query(
        'SELECT payment FROM brandify_sessions WHERE session_id = $1',
        [sessionId]
      );
      assert.equal(sessionRow.rows[0].payment.length, 1);
      assert.equal(sessionRow.rows[0].payment[0].route, 'POST /api/sessions/start');

      await createCaptionRun({
        runId,
        templateImageUrl: 'https://example.com/template.png',
        input: { context: 'audit test', is_twitter_post: false },
        payment: [paymentMeta],
      });

      await insertCaptionStage({
        runId,
        stage: 'template_decode',
        model: 'gpt-4o',
        latencyMs: 50,
        input: {
          image_url: 'https://example.com/template.png',
          system: 'decode',
          user: 'analyze template',
        },
        output: { template_guess: 'Drake' },
      });

      await completeCaptionRun(runId, {
        responseMetadata: { pipeline_persona: ['template_whisperer'], all_candidates_count: 10 },
      });

      await updateCaptionRunPayment(runId, {
        route: 'POST /api/captions/rate',
        price_usd: '0.01',
        payment_header_present: false,
        captured_at: new Date().toISOString(),
      });

      const captionStages = await listCaptionStages(runId);
      assert.equal(captionStages.length, 1);
      assert.ok(captionStages[0].input?.system);

      const runRow = await query(
        'SELECT payment, response_metadata FROM brandify_caption_runs WHERE id = $1',
        [runId]
      );
      assert.equal(runRow.rows[0].payment.length, 2);
      assert.equal(runRow.rows[0].response_metadata.all_candidates_count, 10);

      const logResult = await insertApiRequestLog({
        route: 'POST /api/sessions/start',
        method: 'POST',
        statusCode: 200,
        sessionId,
        payment: paymentMeta,
        requestSummary: { templateId: 'audit-test' },
        responseSummary: { sessionId },
        latencyMs: 321,
        userAgent: 'node-test',
      });
      logId = logResult.rows[0].id;

      const log = await getApiRequestLog(logId);
      assert.equal(log.route, 'POST /api/sessions/start');
      assert.equal(log.session_id, sessionId);
      assert.equal(log.latency_ms, 321);
    } finally {
      if (logId) {
        await query('DELETE FROM brandify_api_request_log WHERE id = $1', [logId]);
      }
      await query('DELETE FROM brandify_caption_runs WHERE id = $1', [runId]);
      await query('DELETE FROM brandify_sessions WHERE session_id = $1', [sessionId]);
    }
  });
});
