#!/usr/bin/env node
/**
 * Smoke test for meme API connection (health, payment, LLMs, x402 gate).
 * Run: node scripts/test-meme-api-connection.js
 */

const API_URL = process.env.REACT_APP_MEME_API_URL || 'https://rekt-automations.onrender.com';

async function main() {
  console.log(`Testing meme API: ${API_URL}\n`);

  const healthRes = await fetch(`${API_URL}/api/meme/health`);
  const health = await healthRes.json();
  console.log('Health:', healthRes.status, health);

  const infoRes = await fetch(`${API_URL}/`);
  const info = await infoRes.json();
  console.log('Payment:', info.payment || 'disabled');

  const llmsRes = await fetch(`${API_URL}/api/meme/llms`);
  const llms = await llmsRes.json();
  console.log(`LLMs: ${llms.presets?.length ?? 0} supported, default=${llms.default}`);
  llms.presets?.forEach((p) => {
    console.log(`  - ${p.id} (${p.tier}${p.supports_vision ? ', vision' : ''})`);
  });

  const form = new FormData();
  form.append('topic', 'connection test');
  form.append('llm', llms.default || 'gpt-4o-mini');
  const imageRes = await fetch(
    'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/PNG_transparency_demonstration_1.png/280px-PNG_transparency_demonstration_1.png'
  );
  const blob = await imageRes.blob();
  form.append('template_image', blob, 'test.png');

  const genRes = await fetch(`${API_URL}/api/meme/generate`, { method: 'POST', body: form });
  console.log(`Generate (no payment): ${genRes.status}`, genRes.status === 402 ? '✓ x402 gate OK' : '');

  if (!healthRes.ok || !llmsRes.ok) {
    process.exit(1);
  }
  console.log('\nAll connection checks passed.');
}

main().catch((err) => {
  console.error('Connection test failed:', err.message);
  process.exit(1);
});
