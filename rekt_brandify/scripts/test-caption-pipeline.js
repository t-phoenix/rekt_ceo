#!/usr/bin/env node
/**
 * E2E caption pipeline test (requires AGENTCASH_WALLET_BASE64 and sample meme image).
 * Usage: node scripts/test-caption-pipeline.js [imagePath] [context]
 */

import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultImage = path.join(
  __dirname,
  '../../rekt_website/src/creatives/memes/Horny/Donald 1.jpg'
);

const imagePath = process.argv[2] || defaultImage;
const context =
  process.argv[3] ||
  'Dev said liquidity is locked forever. CT is not convinced.';

async function main() {
  if (!existsSync(imagePath)) {
    console.error('Image not found:', imagePath);
    process.exit(1);
  }

  if (!process.env.AGENTCASH_WALLET_BASE64) {
    console.error('Set AGENTCASH_WALLET_BASE64 to run E2E caption test.');
    process.exit(1);
  }

  const { uploadImageToStableStudio } = await import('./agentcash-client.js');
  const { runCaptionPipeline } = await import('../server/services/captionPipeline.js');

  console.log('Uploading template...');
  const imageUrl = await uploadImageToStableStudio(imagePath);

  console.log('Running caption pipeline...');
  const result = await runCaptionPipeline({
    imageUrl,
    context,
    contextType: 'topic',
    intensity: 'medium',
    audience: 'ct',
  });

  console.log('\nRun ID:', result.run_id);
  console.log('Template guess:', result.metadata?.template_guess);
  console.log('\nTop captions:');
  for (const opt of result.options) {
    console.log(`\n#${opt.rank} [${opt.humor_tag}] ${(opt.ranking_score * 100).toFixed(0)}%`);
    console.log(`  TOP: ${opt.top_text}`);
    console.log(`  BOTTOM: ${opt.bottom_text}`);
    if (opt.why_funny) console.log(`  WHY: ${opt.why_funny}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
