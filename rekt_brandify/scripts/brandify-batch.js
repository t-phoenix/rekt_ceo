/**
 * brandify-batch.js
 *
 * Batch process N meme templates through the AI brandification pipeline.
 * Processes sequentially (one at a time) to avoid API rate limits.
 * Skips already-processed images. Resumes from where it left off.
 *
 * Usage:
 *   node scripts/brandify-batch.js --limit 3
 *     → Process 3 images per category (36 total)
 *
 *   node scripts/brandify-batch.js --category "Yes - Win - Love" --limit 5
 *     → Process 5 images from one category only
 *
 *   node scripts/brandify-batch.js --limit 1 --dry-run
 *     → Show what would be processed without actually doing it
 */

import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  uploadImageToStableStudio,
  submitEditJob,
  pollJobUntilComplete,
  downloadImage,
  getBalance,
} from './agentcash-client.js';
import { buildBrandifyPrompt, getStrategyDescription } from './prompt-builder.js';
import {
  SOURCE_BASE,
  OUTPUT_BASE,
  LOGS_DIR,
  CATEGORY_CONFIG,
} from '../config/brandify.config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// Parse CLI args
const args = process.argv.slice(2);
const getArg = (flag) => {
  const idx = args.indexOf(flag);
  return idx !== -1 ? args[idx + 1] : null;
};
const hasFlag = (flag) => args.includes(flag);

const limitPerCategory = parseInt(getArg('--limit') || '3', 10);
const filterCategory = getArg('--category');
const dryRun = hasFlag('--dry-run');
const skipExisting = !hasFlag('--reprocess'); // Default: skip already processed

// ─────────────────────────────────────────────
// Collect work items
// ─────────────────────────────────────────────

function collectWorkItems() {
  const sourceBase = path.join(ROOT, SOURCE_BASE);
  const categories = filterCategory
    ? [filterCategory]
    : readdirSync(sourceBase).filter(
        (d) => !d.startsWith('.') && existsSync(path.join(sourceBase, d))
      );

  const items = [];

  for (const category of categories) {
    if (!CATEGORY_CONFIG[category]) {
      console.warn(`⚠️  No config for category "${category}" — skipping.`);
      continue;
    }

    const categoryDir = path.join(sourceBase, category);
    const outputDir = path.join(ROOT, OUTPUT_BASE, category);

    let files;
    try {
      files = readdirSync(categoryDir).filter(
        (f) => /\.(jpe?g|png|gif|webp)$/i.test(f)
      );
    } catch {
      continue;
    }

    // Shuffle for variety in test batches
    const shuffled = files.sort(() => Math.random() - 0.5);
    let addedForCategory = 0;

    for (const filename of shuffled) {
      if (addedForCategory >= limitPerCategory) break;

      const sourcePath = path.join(categoryDir, filename);
      const outputPath = path.join(outputDir, filename);

      // Skip if already processed
      if (skipExisting && existsSync(outputPath)) {
        continue;
      }

      items.push({ category, filename, sourcePath, outputPath, outputDir });
      addedForCategory++;
    }
  }

  return items;
}

// ─────────────────────────────────────────────
// Process one item
// ─────────────────────────────────────────────

async function processItem(item, index, total) {
  const { category, filename, sourcePath, outputPath, outputDir } = item;

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`[${index}/${total}] ${category} / ${filename}`);
  console.log(`  Strategy: ${getStrategyDescription(category)}`);

  if (dryRun) {
    console.log('  [DRY RUN] Would process this file.');
    return { success: true, cost: 0, skipped: false, dryRun: true };
  }

  const result = {
    category,
    filename,
    sourcePath,
    outputPath,
    strategy: getStrategyDescription(category),
    success: false,
    cost: 0,
    durationMs: 0,
    error: null,
    timestamp: new Date().toISOString(),
  };

  const startTime = Date.now();

  try {
    mkdirSync(outputDir, { recursive: true });

    // Build prompt
    const prompt = buildBrandifyPrompt(category, filename);

    // Upload
    process.stdout.write('  ⬆️  Uploading...');
    const imageUrl = await uploadImageToStableStudio(sourcePath);
    process.stdout.write(' ✓\n');

    // Submit job
    process.stdout.write('  🤖 Submitting edit job...');
    const { jobId, pollUrl } = await submitEditJob(imageUrl, prompt);
    process.stdout.write(` ✓ (${jobId})\n`);

    // Poll
    process.stdout.write('  ⏳ Processing');
    const jobResult = await pollJobUntilComplete(pollUrl, jobId, ({ attempt }) => {
      if (attempt % 3 === 0) process.stdout.write('.');
    });
    process.stdout.write(' ✓\n');

    // Download
    process.stdout.write('  ⬇️  Downloading...');
    await downloadImage(jobResult.imageUrl, outputPath);
    process.stdout.write(' ✓\n');

    result.success = true;
    result.cost = jobResult.cost || 0;
    result.durationMs = Date.now() - startTime;
    result.resultUrl = jobResult.imageUrl;

    console.log(`  ✨ Done! Cost: $${result.cost.toFixed(4)} | ${(result.durationMs / 1000).toFixed(1)}s`);

  } catch (err) {
    result.error = err.message;
    result.durationMs = Date.now() - startTime;
    console.error(`  ❌ Failed: ${err.message}`);
  }

  return result;
}

// ─────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────

async function main() {
  console.log('\n🎨 Rekt CEO Brandify — Batch Processor\n');
  console.log(`  Limit per category : ${limitPerCategory}`);
  console.log(`  Category filter    : ${filterCategory || 'ALL'}`);
  console.log(`  Skip existing      : ${skipExisting}`);
  console.log(`  Dry run            : ${dryRun}`);

  if (!dryRun) {
    const balance = await getBalance();
    console.log(`\n💰 AgentCash balance: $${balance >= 0 ? balance.toFixed(4) : 'unknown'}`);
    if (balance >= 0 && balance < 1.0) {
      console.error('\n⚠️  Low balance warning! Recommend at least $1.00 for batch processing.');
      console.error('   Run: npx agentcash fund');
    }
  }

  // Collect work
  const items = collectWorkItems();

  if (items.length === 0) {
    console.log('\n✅ Nothing to process. All items already exist or no matching files.');
    return;
  }

  // Cost estimate
  const estimatedCost = items.length * 0.07; // $0.07 avg per image
  console.log(`\n📋 Work queue: ${items.length} images`);
  console.log(`   Estimated cost: ~$${estimatedCost.toFixed(2)}`);
  console.log(`   Estimated time: ~${Math.ceil(items.length * 1.5)} minutes`);

  if (dryRun) {
    console.log('\n[DRY RUN] Would process:');
    items.forEach((item, i) => {
      console.log(`  ${i + 1}. ${item.category} / ${item.filename}`);
    });
    return;
  }

  // Process items sequentially
  const runLog = {
    startTime: new Date().toISOString(),
    totalItems: items.length,
    results: [],
  };

  for (let i = 0; i < items.length; i++) {
    const result = await processItem(items[i], i + 1, items.length);
    runLog.results.push(result);

    // Brief pause between calls to be respectful of API
    if (i < items.length - 1) {
      await sleep(2000);
    }
  }

  // Summary
  const successes = runLog.results.filter(r => r.success).length;
  const failures = runLog.results.filter(r => !r.success && !r.dryRun).length;
  const totalCost = runLog.results.reduce((sum, r) => sum + (r.cost || 0), 0);

  runLog.endTime = new Date().toISOString();
  runLog.summary = { successes, failures, totalCost };

  console.log('\n' + '═'.repeat(60));
  console.log('BATCH COMPLETE');
  console.log('═'.repeat(60));
  console.log(`  ✅ Succeeded : ${successes}`);
  console.log(`  ❌ Failed    : ${failures}`);
  console.log(`  💰 Total cost: $${totalCost.toFixed(4)}`);

  if (failures > 0) {
    console.log('\nFailed items:');
    runLog.results
      .filter(r => !r.success && !r.dryRun)
      .forEach(r => console.log(`  - ${r.category} / ${r.filename}: ${r.error}`));
  }

  // Save run log
  mkdirSync(path.join(ROOT, LOGS_DIR), { recursive: true });
  const logFile = path.join(ROOT, LOGS_DIR, `batch-${Date.now()}.json`);
  writeFileSync(logFile, JSON.stringify(runLog, null, 2));
  console.log(`\n📋 Run log saved: ${logFile}`);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
