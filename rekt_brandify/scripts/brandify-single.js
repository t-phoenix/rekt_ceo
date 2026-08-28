/**
 * brandify-single.js
 *
 * Process ONE specific meme template through the AI brandification pipeline.
 * Ideal for testing — run this before batch processing.
 *
 * Usage:
 *   node scripts/brandify-single.js --category "Angry - Wicked" --file "Pepe 1.jpg"
 *   node scripts/brandify-single.js --category "Yes - Win - Love" --file "Stonks.jpg"
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
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
import { SOURCE_BASE, OUTPUT_BASE, LOGS_DIR } from '../config/brandify.config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// Parse CLI args
const args = process.argv.slice(2);
const getArg = (flag) => {
  const idx = args.indexOf(flag);
  return idx !== -1 ? args[idx + 1] : null;
};

const category = getArg('--category');
const filename = getArg('--file');

if (!category || !filename) {
  console.error('❌ Usage: node scripts/brandify-single.js --category "<category>" --file "<filename>"');
  console.error('   Example: node scripts/brandify-single.js --category "Angry - Wicked" --file "Pepe 1.jpg"');
  process.exit(1);
}

const sourcePath = path.join(ROOT, SOURCE_BASE, category, filename);
const outputDir = path.join(ROOT, OUTPUT_BASE, category);
const outputPath = path.join(outputDir, filename);

// ─────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────

async function main() {
  console.log('\n🎨 Rekt CEO Brandify — Single Image\n');
  console.log(`  Category  : ${category}`);
  console.log(`  File      : ${filename}`);
  console.log(`  Strategy  : ${getStrategyDescription(category)}`);
  console.log(`  Source    : ${sourcePath}`);
  console.log(`  Output    : ${outputPath}`);

  // Check balance
  const balance = await getBalance();
  console.log(`\n💰 AgentCash balance: $${balance.toFixed(4)}`);
  if (balance < 0.15) {
    console.error('⚠️  Balance may be too low. Recommended minimum $0.15 per image.');
    console.error('   Run: npx agentcash fund');
    process.exit(1);
  }

  // Check source exists
  if (!existsSync(sourcePath)) {
    console.error(`\n❌ Source file not found: ${sourcePath}`);
    process.exit(1);
  }

  // Create output dir
  mkdirSync(outputDir, { recursive: true });

  // Check if already processed
  if (existsSync(outputPath)) {
    console.log(`\n⚠️  Output already exists: ${outputPath}`);
    console.log('   Delete it first to reprocess, or use a different file.');
    process.exit(0);
  }

  const startTime = Date.now();
  const logEntry = {
    timestamp: new Date().toISOString(),
    category,
    filename,
    sourcePath,
    outputPath,
    strategy: getStrategyDescription(category),
    steps: [],
    success: false,
    cost: 0,
    durationMs: 0,
  };

  try {
    // Step 1: Build prompt
    console.log('\n📝 Building brand prompt...');
    const prompt = buildBrandifyPrompt(category, filename);
    logEntry.prompt = prompt;
    logEntry.steps.push({ step: 'prompt_built', ok: true });
    console.log('   Prompt length:', prompt.length, 'chars');

    // Step 2: Upload source image
    console.log('\n⬆️  Uploading source image to StableStudio...');
    const imageUrl = await uploadImageToStableStudio(sourcePath);
    logEntry.uploadedUrl = imageUrl;
    logEntry.steps.push({ step: 'uploaded', ok: true, url: imageUrl });
    console.log('   Uploaded:', imageUrl);

    // Step 3: Submit edit job
    console.log('\n🤖 Submitting GPT Image 2 edit job...');
    const { jobId, pollUrl } = await submitEditJob(imageUrl, prompt);
    logEntry.jobId = jobId;
    logEntry.steps.push({ step: 'job_submitted', ok: true, jobId });
    console.log('   Job ID:', jobId);

    // Step 4: Poll for result
    console.log('\n⏳ Waiting for AI to process...');
    const result = await pollJobUntilComplete(pollUrl, jobId, ({ attempt, maxAttempts }) => {
      process.stdout.write(`\r   Poll attempt ${attempt}/${maxAttempts}...`);
    });
    console.log('\n   ✅ Job complete!');
    logEntry.resultUrl = result.imageUrl;
    logEntry.cost = result.cost;
    logEntry.steps.push({ step: 'completed', ok: true, cost: result.cost });

    // Step 5: Download result
    console.log('\n⬇️  Downloading branded image...');
    await downloadImage(result.imageUrl, outputPath);
    logEntry.steps.push({ step: 'downloaded', ok: true });

    const durationMs = Date.now() - startTime;
    logEntry.success = true;
    logEntry.durationMs = durationMs;

    console.log(`\n✨ SUCCESS! Branded image saved to:\n   ${outputPath}`);
    console.log(`   Cost: $${result.cost?.toFixed(4) || '?'} | Duration: ${(durationMs / 1000).toFixed(1)}s`);

  } catch (err) {
    logEntry.error = err.message;
    logEntry.steps.push({ step: 'error', ok: false, error: err.message });
    logEntry.durationMs = Date.now() - startTime;
    
    console.error('\n❌ ERROR:', err.message);
  }

  // Write log
  mkdirSync(path.join(ROOT, LOGS_DIR), { recursive: true });
  const logFile = path.join(ROOT, LOGS_DIR, `single-${Date.now()}.json`);
  writeFileSync(logFile, JSON.stringify(logEntry, null, 2));
  console.log(`\n📋 Log saved: ${logFile}`);

  if (!logEntry.success) process.exit(1);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
