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
  `${origin}/api/captions/suggest`,
  `${origin}/api/captions/rate`,
  `${origin}/api/cmo/research/intel-pack`,
  `${origin}/api/cmo/content/day-package`,
  `${origin}/api/cmo/content/curate`,
];

function run(args) {
  const result = spawnSync('npx', ['-y', '@agentcash/discovery@latest', ...args], {
    encoding: 'utf8',
    stdio: 'pipe',
  });
  return { code: result.status ?? 1, stdout: result.stdout, stderr: result.stderr };
}

function countSchemaErrors(text) {
  const matches = text.match(/SCHEMA_(INPUT|OUTPUT)_MISSING/g) || [];
  return matches.length;
}

console.log(`\n🔍 Discovery audit for ${origin}\n`);

const discover = run(['discover', origin]);
process.stdout.write(discover.stdout);
if (discover.stderr) process.stderr.write(discover.stderr);

let failed = discover.code !== 0;
let schemaErrors = countSchemaErrors(discover.stdout + (discover.stderr || ''));

for (const url of endpoints) {
  console.log(`\n--- check ${url} ---\n`);
  const check = run(['check', url]);
  process.stdout.write(check.stdout);
  if (check.stderr) process.stderr.write(check.stderr);
  if (check.code !== 0) failed = true;
  schemaErrors += countSchemaErrors(check.stdout + (check.stderr || ''));
}

if (schemaErrors > 0) {
  console.error(
    `\n❌ Found ${schemaErrors} SCHEMA_* discovery errors — add Bazaar declareDiscoveryExtension on paid routes (see server/x402-bazaar.js) before x402scan re-register.\n`
  );
  process.exit(1);
}

if (failed) {
  console.error('\n❌ Discovery audit reported issues — fix before x402scan registration.\n');
  process.exit(1);
}

console.log('\n✅ Discovery audit passed (no CLI errors / SCHEMA_* warnings).\n');
