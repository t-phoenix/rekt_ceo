#!/usr/bin/env node
/**
 * Round-trip test: insert run + stage via captionRuns helpers, then clean up.
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { isPgEnabled } = await import('../server/db/pg.js');
const {
  createCaptionRun,
  insertCaptionStage,
  completeCaptionRun,
  getCaptionRun,
} = await import('../server/db/captionRuns.js');
const { query } = await import('../server/db/pg.js');

async function main() {
  if (!isPgEnabled()) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }

  const runId = uuidv4();

  await createCaptionRun({
    runId,
    creatorWallet: '0xtest',
    templateId: 'drake-test',
    category: 'Drake',
    templateImageUrl: 'https://example.com/meme.jpg',
    input: { context: 'test migration round-trip', intensity: 'medium' },
  });

  await insertCaptionStage({
    runId,
    stage: 'template_decode',
    model: 'gpt-4o',
    latencyMs: 42,
    input: { category: 'Drake' },
    output: { template_guess: 'Drake' },
  });

  await completeCaptionRun(runId);

  const run = await getCaptionRun(runId);
  if (!run || run.status !== 'complete') {
    console.error('Run not found or wrong status:', run);
    process.exit(1);
  }

  console.log('Write/read OK — run', runId, 'status:', run.status);

  await query('DELETE FROM brandify_caption_runs WHERE id = $1', [runId]);
  console.log('Cleanup OK');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
