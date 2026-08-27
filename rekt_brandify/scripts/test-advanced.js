import { execSync } from 'child_process';
import { readdirSync, statSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const memesDir = path.resolve(__dirname, '../../rekt_website/src/creatives/memes');

// Get all valid categories (directories)
const categories = readdirSync(memesDir).filter(c => statSync(path.join(memesDir, c)).isDirectory());

// Helper to pick random element
const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

const numTests = 2;
const tests = [];

console.log('🎲 Selecting random memes for batch test...');
for (let i = 0; i < numTests; i++) {
  const category = pickRandom(categories);
  const files = readdirSync(path.join(memesDir, category)).filter(f => f.endsWith('.jpg') || f.endsWith('.png'));
  if (files.length === 0) continue;
  const file = pickRandom(files);
  tests.push({ category, file });
  console.log(`   - Selected: [${category}] ${file}`);
}

console.log('\n🚀 Starting advanced brandification batch test...');

for (const t of tests) {
  console.log(`\n==============================================`);
  console.log(`🧪 Testing: [${t.category}] ${t.file}`);
  console.log(`==============================================`);
  
  try {
    const cmd = `node scripts/brandify-advanced.js --category "${t.category}" --file "${t.file}"`;
    execSync(cmd, { stdio: 'inherit' });
    console.log(`✅ Passed: ${t.file}`);
  } catch (err) {
    console.error(`❌ Failed: ${t.file}`);
  }
}

console.log('\n🎉 Batch testing complete!');
