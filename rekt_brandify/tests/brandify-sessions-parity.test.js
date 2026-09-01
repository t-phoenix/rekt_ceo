import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const {
  createSession,
  findSession,
  updateSessionVision,
  updateSessionGenerationPrep,
  updateSessionGenerated,
  rateSession,
  listPublicVariations,
  rowToSession,
  SESSION_API_FIELDS,
  VARIATION_API_FIELDS,
  isPgEnabled,
} = await import('../server/db/brandifySessions.js');
const { query } = await import('../server/db/pg.js');

describe('brandify_sessions MongoDB parity', () => {
  it('maps all legacy Session document fields', async (t) => {
    if (!isPgEnabled()) {
      t.skip('DATABASE_URL not set');
      return;
    }

    const sessionId = uuidv4();
    const originalImageUrl = 'https://blob.vercel-storage.com/original.png';
    const generatedImageUrl = 'https://blob.vercel-storage.com/branded.png';

    try {
      await createSession({
        sessionId,
        originalImageUrl,
        userCustomTarget: 'logo on shirt',
        templateId: 'drake-1',
        category: 'Drake',
        templateFilename: 'drake.jpg',
        creatorWallet: '0xabc',
      });

      const strategy = {
        elements: [
          {
            name: 'shirt',
            type: 'existing',
            reasoning: 'visible',
            ideas: ['add $CEO logo'],
          },
        ],
      };
      await updateSessionVision(sessionId, strategy);

      const choices = [
        { element: 'shirt', idea: 'embroider $CEO', isCustom: false },
      ];
      await updateSessionGenerationPrep(sessionId, choices, 'For shirt: embroider $CEO');

      await updateSessionGenerated(sessionId, {
        engineUsed: 'flux-2-pro',
        generatedImageUrl,
      });

      await rateSession(sessionId, 'Like');

      const session = await findSession(sessionId);
      assert.ok(session, 'session should exist');

      for (const field of SESSION_API_FIELDS) {
        assert.ok(field in session, `missing field: ${field}`);
      }

      assert.equal(session.sessionId, sessionId);
      assert.equal(session.originalImageUrl, originalImageUrl);
      assert.equal(session.generatedImageUrl, generatedImageUrl);
      assert.equal(session.userCustomTarget, 'logo on shirt');
      assert.equal(session.templateId, 'drake-1');
      assert.equal(session.category, 'Drake');
      assert.equal(session.templateFilename, 'drake.jpg');
      assert.equal(session.creatorWallet, '0xabc');
      assert.equal(session.engineUsed, 'flux-2-pro');
      assert.equal(session.userRating, 'Like');
      assert.equal(session.isPublic, true);
      assert.ok(session.aiVisionRaw?.elements?.length === 1);
      assert.equal(session.userCuratedChoices[0].isCustom, false);
      assert.match(session.timestamp, /^\d{4}-\d{2}-\d{2}T/);
      assert.match(session.publishedAt, /^\d{4}-\d{2}-\d{2}T/);

      const { total, items } = await listPublicVariations('drake-1', { limit: 10, offset: 0 });
      assert.ok(total >= 1);
      const item = items.find((i) => i.sessionId === sessionId);
      assert.ok(item, 'variation should appear in public list');

      for (const field of VARIATION_API_FIELDS) {
        assert.ok(field in item, `variation missing field: ${field}`);
      }

      assert.equal(item.generatedImageUrl, generatedImageUrl);
      assert.equal(item.originalImageUrl, originalImageUrl);
      assert.match(item.timestamp, /^\d{4}-\d{2}-\d{2}T/);
    } finally {
      await query('DELETE FROM brandify_sessions WHERE session_id = $1', [sessionId]);
    }
  });

  it('rowToSession returns nulls for unset optional fields', () => {
    const session = rowToSession({
      session_id: uuidv4(),
      created_at: new Date(),
      original_image_url: 'https://example.com/a.jpg',
      is_public: true,
    });

    assert.equal(session.generatedImageUrl, null);
    assert.equal(session.userCustomTarget, null);
    assert.equal(session.aiVisionRaw, null);
    assert.deepEqual(session.userCuratedChoices, []);
    assert.equal(session.userRating, null);
    assert.equal(session.error, null);
  });
});
