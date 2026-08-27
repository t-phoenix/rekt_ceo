/**
 * status.js
 *
 * Shows a quick overview of brandification progress:
 * - How many images are in each category (source)
 * - How many have been processed (output exists)
 * - How many are pending
 * - Recent run logs summary
 *
 * Usage:
 *   node scripts/status.js
 */

import { existsSync, readdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SOURCE_BASE, OUTPUT_BASE, LOGS_DIR } from '../config/brandify.config.js';
import { getBalance } from './agentcash-client.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const IMAGE_EXT = /\.(jpe?g|png|gif|webp)$/i;

function countImages(dir) {
  if (!existsSync(dir)) return 0;
  try {
    return readdirSync(dir).filter(f => IMAGE_EXT.test(f)).length;
  } catch {
    return 0;
  }
}

function pad(str, len) {
  return String(str).padEnd(len);
}

function rpad(str, len) {
  return String(str).padStart(len);
}

async function main() {
  const sourceBase = path.join(ROOT, SOURCE_BASE);
  const outputBase = path.join(ROOT, OUTPUT_BASE);

  const categories = existsSync(sourceBase)
    ? readdirSync(sourceBase).filter(d => !d.startsWith('.') && existsSync(path.join(sourceBase, d)))
    : [];

  console.log('\n🎨 Rekt CEO Brandify — Status\n');

  // Balance
  const balance = getBalance();
  console.log(`💰 AgentCash balance: $${balance >= 0 ? balance.toFixed(4) : 'unknown'}\n`);

  // Table header
  const col1 = 32, col2 = 8, col3 = 10, col4 = 10, col5 = 8;
  console.log(
    pad('Category', col1) +
    rpad('Source', col2) +
    rpad('Done', col3) +
    rpad('Pending', col4) +
    rpad('%', col5)
  );
  console.log('─'.repeat(col1 + col2 + col3 + col4 + col5));

  let totalSource = 0, totalDone = 0;

  for (const category of categories) {
    const sourceCount = countImages(path.join(sourceBase, category));
    const doneCount = countImages(path.join(outputBase, category));
    const pending = sourceCount - doneCount;
    const pct = sourceCount > 0 ? Math.round((doneCount / sourceCount) * 100) : 0;
    
    const bar = pct === 100 ? '✅' : pct > 0 ? '🔄' : '⬜';
    
    console.log(
      pad(`${bar} ${category}`, col1) +
      rpad(sourceCount, col2) +
      rpad(doneCount, col3) +
      rpad(pending, col4) +
      rpad(`${pct}%`, col5)
    );

    totalSource += sourceCount;
    totalDone += doneCount;
  }

  const totalPending = totalSource - totalDone;
  const totalPct = totalSource > 0 ? Math.round((totalDone / totalSource) * 100) : 0;

  console.log('─'.repeat(col1 + col2 + col3 + col4 + col5));
  console.log(
    pad('TOTAL', col1) +
    rpad(totalSource, col2) +
    rpad(totalDone, col3) +
    rpad(totalPending, col4) +
    rpad(`${totalPct}%`, col5)
  );

  // Cost estimate for remaining
  const estCostRemaining = totalPending * 0.07;
  console.log(`\n📊 Remaining: ${totalPending} images (~$${estCostRemaining.toFixed(2)} estimated)`);

  // Recent logs
  const logsDir = path.join(ROOT, LOGS_DIR);
  if (existsSync(logsDir)) {
    const logs = readdirSync(logsDir)
      .filter(f => f.endsWith('.json'))
      .sort()
      .reverse()
      .slice(0, 3);

    if (logs.length > 0) {
      console.log('\n📋 Recent runs:');
      for (const logFile of logs) {
        try {
          const { createReadStream } = await import('fs');
          const content = await import('fs').then(fs => fs.readFileSync(path.join(logsDir, logFile), 'utf8'));
          const log = JSON.parse(content);
          
          if (log.summary) {
            // Batch log
            console.log(`  ${logFile}: ✅${log.summary.successes} ❌${log.summary.failures} | $${(log.summary.totalCost || 0).toFixed(4)}`);
          } else if (log.success !== undefined) {
            // Single log
            const status = log.success ? '✅' : '❌';
            console.log(`  ${logFile}: ${status} ${log.category}/${log.filename} | $${(log.cost || 0).toFixed(4)}`);
          }
        } catch {
          // skip unreadable logs
        }
      }
    }
  }

  console.log('');
}

main().catch(console.error);
