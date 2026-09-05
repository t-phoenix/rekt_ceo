import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_ROOT = path.resolve(__dirname, '../../brand_assets/meme_templates');
const MANIFEST_PATH = path.join(TEMPLATES_ROOT, 'templates-manifest.json');

/** Same template must not be auto-picked again for this many subsequent picks. */
export const TEMPLATE_COOLDOWN_COUNT = 100;

const KEYWORD_STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'to', 'of', 'in', 'on', 'for', 'is', 'it', 'at',
  'no', 'yes', 'not', 'me', 'my', 'we', 'you', 'our', 'ct', 'vs', 'with', 'from',
  'this', 'that', 'be', 'as', 'by', 'up', 'so', 'if', 'do', 're', 'ceo', 'rekt',
]);

let cachedManifest = null;
/** Most-recent-first ring of auto-picked template ids (process lifetime + DB seed). */
const recentPickIds = [];

function loadManifest() {
  if (cachedManifest) return cachedManifest;
  if (!fs.existsSync(MANIFEST_PATH)) {
    return { generatedAt: null, count: 0, categories: [], items: [] };
  }
  cachedManifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  return cachedManifest;
}

export function reloadTemplateManifest() {
  cachedManifest = null;
  return loadManifest();
}

export function listTemplates({ category, limit, offset = 0, q } = {}) {
  const manifest = loadManifest();
  let items = Array.isArray(manifest.items) ? [...manifest.items] : [];
  if (category) {
    const c = String(category).toLowerCase();
    items = items.filter((i) => String(i.category).toLowerCase() === c);
  }
  if (q) {
    const needle = String(q).toLowerCase();
    items = items.filter(
      (i) =>
        i.id.includes(needle)
        || String(i.name).toLowerCase().includes(needle)
        || String(i.category).toLowerCase().includes(needle),
    );
  }
  const total = items.length;
  const start = Math.max(0, Number(offset) || 0);
  const lim = limit != null ? Math.min(Math.max(Number(limit) || 0, 1), 500) : items.length;
  const slice = items.slice(start, start + lim);
  return {
    generatedAt: manifest.generatedAt,
    count: total,
    categories: manifest.categories || [],
    items: slice,
    limit: lim,
    offset: start,
  };
}

export function getTemplate(id) {
  const manifest = loadManifest();
  const item = (manifest.items || []).find((i) => i.id === id);
  if (!item) return null;
  const absPath = path.join(TEMPLATES_ROOT, item.relativePath);
  return {
    ...item,
    absolutePath: absPath,
    exists: fs.existsSync(absPath),
  };
}

export function readTemplateBuffer(id) {
  const tpl = getTemplate(id);
  if (!tpl || !tpl.exists) {
    throw new Error(`Template not found on disk: ${id}`);
  }
  return {
    buffer: fs.readFileSync(tpl.absolutePath),
    mimeType: mimeFromFilename(tpl.filename),
    template: tpl,
  };
}

export function mimeFromFilename(filename) {
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.gif') return 'image/gif';
  if (ext === '.webp') return 'image/webp';
  return 'application/octet-stream';
}

export function rememberTemplatePick(id) {
  if (!id) return;
  const key = String(id);
  const idx = recentPickIds.indexOf(key);
  if (idx >= 0) recentPickIds.splice(idx, 1);
  recentPickIds.unshift(key);
  if (recentPickIds.length > TEMPLATE_COOLDOWN_COUNT) {
    recentPickIds.length = TEMPLATE_COOLDOWN_COUNT;
  }
}

export function seedRecentTemplateIds(ids = []) {
  for (const id of [...ids].reverse()) {
    rememberTemplatePick(id);
  }
}

export function getRecentTemplateIds(limit = TEMPLATE_COOLDOWN_COUNT) {
  return recentPickIds.slice(0, Math.max(0, Number(limit) || TEMPLATE_COOLDOWN_COUNT));
}

function normalizeCategoryKey(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function categoryPool(items, preferredCategory) {
  if (!preferredCategory) return items;
  const pref = normalizeCategoryKey(preferredCategory);
  if (!pref) return items;
  const exact = items.filter((i) => normalizeCategoryKey(i.category) === pref);
  if (exact.length) return exact;
  const loose = items.filter((i) => {
    const cat = normalizeCategoryKey(i.category);
    return cat.includes(pref) || pref.includes(cat);
  });
  return loose.length ? loose : items;
}

function keywordTokens(ideate = {}) {
  const raw = [
    ...(Array.isArray(ideate.template_keywords) ? ideate.template_keywords : []),
    ideate.visual_concept,
    ideate.vibe,
  ].filter(Boolean);

  const tokens = [];
  for (const value of raw) {
    const parts = String(value)
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(Boolean);
    for (const part of parts) {
      if (part.length < 4) continue;
      if (KEYWORD_STOPWORDS.has(part)) continue;
      tokens.push(part);
    }
  }
  return [...new Set(tokens)];
}

function scoreTemplate(item, tokens) {
  if (!tokens.length) return 0;
  const nameHay = `${item.id} ${item.name}`.toLowerCase();
  const catHay = String(item.category || '').toLowerCase();
  let score = 0;
  for (const tok of tokens) {
    if (nameHay.includes(tok)) score += 3;
    else if (catHay.includes(tok)) score += 1;
  }
  return score;
}

function filterCoolingDown(pool, excludeIds) {
  if (!excludeIds?.size) return { available: pool, cooled: [] };
  const available = [];
  const cooled = [];
  for (const item of pool) {
    if (excludeIds.has(item.id)) cooled.push(item);
    else available.push(item);
  }
  return { available, cooled };
}

function pickRandom(items) {
  if (!items.length) return null;
  return items[Math.floor(Math.random() * items.length)];
}

/**
 * Pick a template from ideate hints (category / keywords).
 * Auto picks never reuse a template from the last TEMPLATE_COOLDOWN_COUNT selections
 * when alternatives exist. Explicit overrideId bypasses cooldown.
 */
export function pickTemplateFromIdeate(ideate = {}, overrideId = null, opts = {}) {
  if (overrideId) {
    const t = getTemplate(overrideId);
    if (t?.exists) return t;
  }

  const manifest = loadManifest();
  const items = manifest.items || [];
  if (!items.length) throw new Error('No meme templates available — run scripts/sync-meme-templates.js');

  const excludeIds = new Set([
    ...getRecentTemplateIds(),
    ...(opts.excludeIds || []),
  ].filter(Boolean).map(String));

  const preferredCategory = String(ideate.template_category || ideate.category || '');
  let pool = categoryPool(items, preferredCategory);
  const tokens = keywordTokens(ideate);

  let { available, cooled } = filterCoolingDown(pool, excludeIds);
  if (!available.length) {
    // Prefer another category rather than reuse a cooled template.
    const global = filterCoolingDown(items, excludeIds);
    if (global.available.length) {
      pool = items;
      available = global.available;
      cooled = global.cooled;
    } else {
      // Entire catalog is in cooldown — pick the least-recently used in the preferred pool.
      available = cooled.length ? cooled : pool;
    }
  }

  let chosen = null;
  if (tokens.length) {
    const scored = available.map((i) => ({ i, score: scoreTemplate(i, tokens) }));
    const max = Math.max(...scored.map((s) => s.score));
    if (max > 0) {
      const top = scored.filter((s) => s.score === max).map((s) => s.i);
      chosen = pickRandom(top);
    }
  }
  if (!chosen) chosen = pickRandom(available);
  if (!chosen) chosen = pickRandom(pool) || items[0];

  const resolved = getTemplate(chosen.id);
  if (resolved?.exists && !opts.skipRemember) {
    rememberTemplatePick(resolved.id);
  }
  return resolved;
}

export { TEMPLATES_ROOT, MANIFEST_PATH };
