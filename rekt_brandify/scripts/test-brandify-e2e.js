/**
 * End-to-end brandify API test against a running local server.
 * Usage: node scripts/test-brandify-e2e.js [baseUrl]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = process.argv[2] || 'http://localhost:3002';
const MEME_PATH = path.resolve(
  __dirname,
  '../../rekt_website/src/creatives/meme/Drake.png'
);

async function postMultipart(url, fields, fileField, filePath) {
  const form = new FormData();
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined && value !== null) form.append(key, String(value));
  });
  form.append(fileField, new Blob([fs.readFileSync(filePath)]), path.basename(filePath));

  const res = await fetch(url, { method: 'POST', body: form });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text.slice(0, 500) };
  }
  return { status: res.status, body };
}

async function postJson(url, payload) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

function logStep(label, ok, detail = '') {
  const icon = ok ? '✅' : '❌';
  console.log(`${icon} ${label}${detail ? ` — ${detail}` : ''}`);
}

async function main() {
  console.log('\n🧪 Brandify E2E test');
  console.log(`   Server: ${BASE_URL}`);
  console.log(`   Meme:   Drake.png\n`);

  if (!fs.existsSync(MEME_PATH)) {
    console.error(`Meme template not found: ${MEME_PATH}`);
    process.exit(1);
  }

  // Health
  const healthRes = await fetch(`${BASE_URL}/health`);
  const health = await healthRes.json();
  logStep('Health check', healthRes.ok, healthRes.ok ? health.service : healthRes.status);
  if (!healthRes.ok) process.exit(1);

  // Analyze (sessions/start)
  console.log('\n📤 POST /api/sessions/start (analyze)...');
  const t0 = Date.now();
  const start = await postMultipart(
    `${BASE_URL}/api/sessions/start`,
    {
      templateId: '2',
      category: 'Yes - Win - Love',
      templateFilename: 'Drake.png',
      customTarget: 'the pointing hand gesture',
    },
    'image',
    MEME_PATH
  );
  const analyzeSec = ((Date.now() - t0) / 1000).toFixed(1);

  logStep(
    'Analyze session',
    start.status === 200,
    start.status === 200
      ? `${analyzeSec}s, ${start.body.strategy?.elements?.length ?? 0} elements`
      : `HTTP ${start.status}: ${start.body.error || start.body.raw || JSON.stringify(start.body)}`
  );

  if (start.status !== 200) {
    process.exit(1);
  }

  const { sessionId, imageUrl, strategy } = start.body;
  console.log(`   sessionId: ${sessionId}`);
  console.log(`   imageUrl:  ${imageUrl?.slice(0, 72)}...`);
  strategy?.elements?.slice(0, 2).forEach((el) => {
    console.log(`   • ${el.name}: ${el.ideas?.[0]?.slice(0, 60)}...`);
  });

  // Generate (pick first idea per element)
  const userCuratedChoices = (strategy?.elements || [])
    .filter((el) => el.ideas?.[0])
    .slice(0, 2)
    .map((el) => ({ element: el.name, idea: el.ideas[0] }));

  if (userCuratedChoices.length === 0) {
    console.error('No brandify ideas to generate with.');
    process.exit(1);
  }

  console.log('\n🎨 POST /api/generate (brandify)...');
  console.log(`   Choices: ${userCuratedChoices.map((c) => c.element).join(', ')}`);
  const t1 = Date.now();
  const gen = await postJson(`${BASE_URL}/api/generate`, {
    sessionId,
    userCuratedChoices,
  });
  const genSec = ((Date.now() - t1) / 1000).toFixed(1);

  logStep(
    'Generate branded meme',
    gen.status === 200,
    gen.status === 200
      ? `${genSec}s, engine=${gen.body.engineUsed}`
      : `HTTP ${gen.status}: ${gen.body.error || JSON.stringify(gen.body)}`
  );

  if (gen.status !== 200) {
    process.exit(1);
  }

  console.log(`   generatedImageUrl: ${gen.body.generatedImageUrl?.slice(0, 72)}...`);

  console.log('\n✅ Brandify E2E test PASSED\n');
}

main().catch((err) => {
  console.error('\n❌ Test failed:', err.message);
  process.exit(1);
});
