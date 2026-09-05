#!/usr/bin/env node
/**
 * Copy meme templates from rekt_website into brandify and build templates-manifest.json.
 *
 * Usage: node scripts/sync-meme-templates.js
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BRANDIFY_ROOT = path.resolve(__dirname, '..');
const SOURCE = path.resolve(BRANDIFY_ROOT, '../rekt_website/src/creatives/memes');
const DEST = path.resolve(BRANDIFY_ROOT, 'brand_assets/meme_templates');
const MANIFEST = path.join(DEST, 'templates-manifest.json');

function slugify(input) {
  return String(input)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function titleCaseFromFilename(fileBase) {
  return fileBase
    .replace(/[_-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (entry.name === '.DS_Store') continue;
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}

function walkImages(root, category = null, relBase = '') {
  const out = [];
  if (!fs.existsSync(root)) return out;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (entry.name === '.DS_Store' || entry.name === 'templates-manifest.json') continue;
    const abs = path.join(root, entry.name);
    const rel = relBase ? `${relBase}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      out.push(...walkImages(abs, entry.name, rel));
      continue;
    }
    if (!/\.(png|jpe?g|gif|webp)$/i.test(entry.name)) continue;
    const cat = category || 'Uncategorized';
    const fileBase = entry.name.replace(/\.[^.]+$/, '');
    out.push({
      id: `${slugify(cat)}-${slugify(fileBase)}`,
      name: titleCaseFromFilename(fileBase),
      category: cat,
      filename: entry.name,
      relativePath: rel.replace(/\\/g, '/'),
    });
  }
  return out;
}

if (!fs.existsSync(SOURCE)) {
  console.error(`Source not found: ${SOURCE}`);
  process.exit(1);
}

console.log(`Syncing templates\n  from: ${SOURCE}\n  to:   ${DEST}`);
fs.rmSync(DEST, { recursive: true, force: true });
copyDir(SOURCE, DEST);

const items = walkImages(DEST).sort((a, b) => {
  const c = a.category.localeCompare(b.category);
  return c || a.name.localeCompare(b.name);
});

const categories = [...new Set(items.map((i) => i.category))].sort();
const manifest = {
  generatedAt: new Date().toISOString(),
  source: 'rekt_website/src/creatives/memes',
  count: items.length,
  categories,
  items,
};

fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));
console.log(`Wrote ${items.length} templates across ${categories.length} categories → ${MANIFEST}`);
