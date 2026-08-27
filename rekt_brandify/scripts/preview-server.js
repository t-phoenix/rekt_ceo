/**
 * preview-server.js
 *
 * Starts a local HTTP server at http://localhost:3333
 * that shows a side-by-side gallery of original vs. branded meme templates.
 * 
 * Perfect for QA — scroll through all processed images and visually check quality.
 *
 * Usage:
 *   node scripts/preview-server.js
 *   node scripts/preview-server.js --category "Angry - Wicked"
 *   node scripts/preview-server.js --port 4000
 */

import { createServer } from 'http';
import { existsSync, readdirSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SOURCE_BASE, OUTPUT_BASE } from '../config/brandify.config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const getArg = (flag) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : null; };
const PORT = parseInt(getArg('--port') || '3333', 10);
const filterCategory = getArg('--category');
const IMAGE_EXT = /\.(jpe?g|png|gif|webp)$/i;

function getProcessedPairs() {
  const sourceBase = path.join(ROOT, SOURCE_BASE);
  const outputBase = path.join(ROOT, OUTPUT_BASE);
  const pairs = [];

  const categories = filterCategory
    ? [filterCategory]
    : (existsSync(sourceBase) ? readdirSync(sourceBase).filter(d => !d.startsWith('.')) : []);

  for (const category of categories) {
    const outputDir = path.join(outputBase, category);
    if (!existsSync(outputDir)) continue;
    
    const processedFiles = readdirSync(outputDir).filter(f => IMAGE_EXT.test(f));
    for (const filename of processedFiles) {
      pairs.push({ category, filename });
    }
  }

  return pairs;
}

function serveImage(res, filePath) {
  if (!existsSync(filePath)) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  const ext = path.extname(filePath).toLowerCase();
  const mime = ext === '.png' ? 'image/png' : ext === '.gif' ? 'image/gif' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
  const data = readFileSync(filePath);
  res.writeHead(200, { 'Content-Type': mime });
  res.end(data);
}

function generateHtml(pairs) {
  const cards = pairs.map(({ category, filename }) => `
    <div class="card">
      <div class="label">${category}</div>
      <div class="filename">${filename}</div>
      <div class="images">
        <div class="side">
          <div class="badge original">ORIGINAL</div>
          <img src="/source/${encodeURIComponent(category)}/${encodeURIComponent(filename)}" loading="lazy" />
        </div>
        <div class="arrow">→</div>
        <div class="side">
          <div class="badge branded">BRANDED ✨</div>
          <img src="/output/${encodeURIComponent(category)}/${encodeURIComponent(filename)}" loading="lazy" />
        </div>
      </div>
    </div>
  `).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Rekt CEO Brandify — QA Preview</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: #0D0E1A;
    color: #F5F5F0;
    font-family: 'Segoe UI', system-ui, sans-serif;
    min-height: 100vh;
  }
  header {
    background: linear-gradient(135deg, #0D0E1A 0%, #1a1b2e 100%);
    border-bottom: 2px solid #F5C518;
    padding: 1.5rem 2rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: sticky;
    top: 0;
    z-index: 100;
  }
  header h1 {
    font-size: 1.4rem;
    font-weight: 700;
    color: #F5C518;
    letter-spacing: 0.05em;
  }
  header .stats {
    font-size: 0.85rem;
    color: #4DBFBF;
  }
  .container {
    padding: 2rem;
    max-width: 1600px;
    margin: 0 auto;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(700px, 1fr));
    gap: 2rem;
  }
  .card {
    background: #1a1b2e;
    border: 1px solid #2a2b3e;
    border-radius: 16px;
    overflow: hidden;
    transition: border-color 0.2s;
  }
  .card:hover {
    border-color: #F5C518;
  }
  .label {
    background: #E8307A;
    color: white;
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    padding: 0.3rem 1rem;
  }
  .filename {
    padding: 0.6rem 1rem;
    font-size: 0.85rem;
    color: #aaa;
    border-bottom: 1px solid #2a2b3e;
    font-family: monospace;
  }
  .images {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 1rem;
  }
  .side {
    flex: 1;
    position: relative;
    min-width: 0;
  }
  .side img {
    width: 100%;
    height: 220px;
    object-fit: contain;
    border-radius: 8px;
    background: #0D0E1A;
    display: block;
  }
  .badge {
    position: absolute;
    top: 6px;
    left: 6px;
    font-size: 0.6rem;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 4px;
    z-index: 10;
  }
  .badge.original { background: #333; color: #aaa; }
  .badge.branded { background: #F5C518; color: #0D0E1A; }
  .arrow {
    font-size: 1.5rem;
    color: #F5C518;
    flex-shrink: 0;
    padding: 0 0.5rem;
  }
  .empty {
    text-align: center;
    padding: 4rem 2rem;
    color: #555;
  }
  .empty h2 { font-size: 1.5rem; margin-bottom: 1rem; }
  .empty code {
    background: #1a1b2e;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    display: inline-block;
    color: #4DBFBF;
    font-size: 0.9rem;
  }
</style>
</head>
<body>
<header>
  <h1>🎨 Rekt CEO Brandify — QA Preview</h1>
  <div class="stats">${pairs.length} processed templates</div>
</header>
<div class="container">
  ${pairs.length === 0 ? `
    <div class="empty">
      <h2>No branded images yet</h2>
      <p>Run the brandify pipeline first:</p><br>
      <code>node scripts/brandify-single.js --category "Angry - Wicked" --file "Pepe 1.jpg"</code>
      <br><br>
      <p>Then refresh this page.</p>
    </div>
  ` : `<div class="grid">${cards}</div>`}
</div>
</body>
</html>`;
}

const server = createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = decodeURIComponent(url.pathname);

  if (pathname === '/' || pathname === '/index.html') {
    const pairs = getProcessedPairs();
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(generateHtml(pairs));
    return;
  }

  // Serve source image: /source/:category/:filename
  const sourceMatch = pathname.match(/^\/source\/(.+?)\/(.+)$/);
  if (sourceMatch) {
    const [, cat, file] = sourceMatch;
    serveImage(res, path.join(ROOT, SOURCE_BASE, cat, file));
    return;
  }

  // Serve output image: /output/:category/:filename
  const outputMatch = pathname.match(/^\/output\/(.+?)\/(.+)$/);
  if (outputMatch) {
    const [, cat, file] = outputMatch;
    serveImage(res, path.join(ROOT, OUTPUT_BASE, cat, file));
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`\n🖼️  Rekt CEO Brandify — QA Preview Server`);
  console.log(`   Open: http://localhost:${PORT}`);
  console.log(`   Press Ctrl+C to stop\n`);
  
  // Auto-open browser on macOS
  try {
    const { execSync } = await import('child_process');
    execSync(`open http://localhost:${PORT}`);
  } catch {
    // ignore
  }
});
