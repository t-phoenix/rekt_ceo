#!/usr/bin/env node
/**
 * Verify x402 discovery readiness against a running or deployed origin.
 * Usage:
 *   node scripts/verify-discovery.js
 *   X402_VERIFY_ORIGIN=https://rekt-ceo-brandification.onrender.com node scripts/verify-discovery.js
 */

import { spawnSync } from 'node:child_process';

const origin =
  process.env.X402_VERIFY_ORIGIN || 'https://rekt-ceo-brandification.onrender.com';

const endpoints = [
  `${origin}/api/sessions/start`,
  `${origin}/api/generate`,
  `${origin}/api/sessions/rate`,
];

function run(args) {
  const result = spawnSync('npx', ['-y', '@agentcash/discovery@latest', ...args], {
    encoding: 'utf8',
    stdio: 'pipe',
  });
  return { code: result.status ?? 1, stdout: result.stdout, stderr: result.stderr };
}

console.log(`\n🔍 Discovery audit for ${origin}\n`);

const discover = run(['discover', origin]);
process.stdout.write(discover.stdout);
if (discover.stderr) process.stderr.write(discover.stderr);

let failed = discover.code !== 0;

for (const url of endpoints) {
  console.log(`\n--- check ${url} ---\n`);
  const check = run(['check', url]);
  process.stdout.write(check.stdout);
  if (check.stderr) process.stderr.write(check.stderr);
  if (check.code !== 0) failed = true;
}

if (failed) {
  console.error('\n❌ Discovery audit reported issues — fix before x402scan registration.\n');
  process.exit(1);
}

console.log('\n✅ Discovery audit passed (no CLI errors). Review warnings above before registering.\n');
