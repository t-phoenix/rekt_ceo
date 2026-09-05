import { v4 as uuidv4 } from 'uuid';
import { query, isPgEnabled } from '../../server/db/pg.js';

const MEMORY = new Map();

function normalize(row) {
  if (!row) return null;
  return {
    ...row,
    do_follow: typeof row.do_follow === 'string' ? JSON.parse(row.do_follow) : (row.do_follow || []),
    dont_follow: typeof row.dont_follow === 'string' ? JSON.parse(row.dont_follow) : (row.dont_follow || []),
    metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : (row.metadata || {}),
    keywords: row.keywords || [],
  };
}

function slugify(title) {
  return String(title || 'feature')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || `feature-${Date.now()}`;
}

export async function listProductFeatures({ activeOnly = false, category = null, limit = 100 } = {}) {
  if (!isPgEnabled()) {
    return [...MEMORY.values()]
      .filter((f) => (!activeOnly || f.active) && (!category || f.category === category))
      .sort((a, b) => (a.priority || 100) - (b.priority || 100))
      .slice(0, limit);
  }
  const params = [];
  const where = [];
  if (activeOnly) where.push('active = TRUE');
  if (category) {
    params.push(category);
    where.push(`category = $${params.length}`);
  }
  params.push(Math.min(Math.max(Number(limit) || 100, 1), 200));
  let sql = `SELECT * FROM cmo_product_features`;
  if (where.length) sql += ` WHERE ${where.join(' AND ')}`;
  sql += ` ORDER BY priority ASC, title ASC LIMIT $${params.length}`;
  const result = await query(sql, params);
  return (result?.rows || []).map(normalize);
}

export async function getProductFeaturesByIds(ids = []) {
  const list = (ids || []).map(String).filter(Boolean);
  if (!list.length) return [];
  if (!isPgEnabled()) {
    return list.map((id) => MEMORY.get(id)).filter(Boolean).map(normalize);
  }
  const result = await query(
    `SELECT * FROM cmo_product_features WHERE id = ANY($1::uuid[])`,
    [list],
  );
  return (result?.rows || []).map(normalize);
}

export async function getProductFeatureBySlug(slug) {
  if (!slug) return null;
  if (!isPgEnabled()) {
    return [...MEMORY.values()].find((f) => f.slug === slug) || null;
  }
  const result = await query(`SELECT * FROM cmo_product_features WHERE slug = $1`, [slug]);
  return normalize(result?.rows?.[0]);
}

export async function createProductFeature(fields = {}) {
  const id = uuidv4();
  const slug = fields.slug || slugify(fields.title);
  const row = {
    id,
    slug,
    title: fields.title || 'Untitled feature',
    status: fields.status || 'live',
    category: fields.category || 'product',
    url: fields.url || null,
    short_description: fields.short_description || null,
    long_description: fields.long_description || null,
    cta_label: fields.cta_label || null,
    cta_url: fields.cta_url || fields.url || null,
    do_follow: fields.do_follow || [],
    dont_follow: fields.dont_follow || [],
    keywords: fields.keywords || [],
    priority: fields.priority ?? 100,
    active: fields.active !== false,
    metadata: fields.metadata || {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  if (!isPgEnabled()) {
    MEMORY.set(id, row);
    return row;
  }
  const result = await query(
    `INSERT INTO cmo_product_features
      (id, slug, title, status, category, url, short_description, long_description,
       cta_label, cta_url, do_follow, dont_follow, keywords, priority, active, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
     RETURNING *`,
    [
      id,
      slug,
      row.title,
      row.status,
      row.category,
      row.url,
      row.short_description,
      row.long_description,
      row.cta_label,
      row.cta_url,
      JSON.stringify(row.do_follow),
      JSON.stringify(row.dont_follow),
      row.keywords,
      row.priority,
      row.active,
      JSON.stringify(row.metadata),
    ],
  );
  return normalize(result?.rows?.[0]) || row;
}

export async function updateProductFeature(id, patch = {}) {
  if (!isPgEnabled()) {
    const existing = MEMORY.get(id);
    if (!existing) return null;
    const next = { ...existing, ...patch, updated_at: new Date().toISOString() };
    MEMORY.set(id, next);
    return next;
  }
  const existingResult = await query(`SELECT * FROM cmo_product_features WHERE id = $1`, [id]);
  const existing = normalize(existingResult?.rows?.[0]);
  if (!existing) return null;

  const next = {
    ...existing,
    ...patch,
    do_follow: patch.do_follow !== undefined ? patch.do_follow : existing.do_follow,
    dont_follow: patch.dont_follow !== undefined ? patch.dont_follow : existing.dont_follow,
    metadata: patch.metadata !== undefined
      ? { ...(existing.metadata || {}), ...(patch.metadata || {}) }
      : existing.metadata,
  };

  const result = await query(
    `UPDATE cmo_product_features SET
      slug = $2, title = $3, status = $4, category = $5, url = $6,
      short_description = $7, long_description = $8, cta_label = $9, cta_url = $10,
      do_follow = $11, dont_follow = $12, keywords = $13, priority = $14,
      active = $15, metadata = $16, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [
      id,
      next.slug,
      next.title,
      next.status,
      next.category,
      next.url,
      next.short_description,
      next.long_description,
      next.cta_label,
      next.cta_url,
      JSON.stringify(next.do_follow || []),
      JSON.stringify(next.dont_follow || []),
      next.keywords || [],
      next.priority ?? 100,
      next.active !== false,
      JSON.stringify(next.metadata || {}),
    ],
  );
  return normalize(result?.rows?.[0]);
}

export async function deleteProductFeature(id) {
  if (!isPgEnabled()) {
    MEMORY.delete(id);
    return true;
  }
  await query(`DELETE FROM cmo_product_features WHERE id = $1`, [id]);
  return true;
}

export async function upsertFeatureBySlug(fields = {}) {
  const slug = fields.slug || slugify(fields.title);
  const existing = await getProductFeatureBySlug(slug);
  if (existing) {
    return updateProductFeature(existing.id, { ...fields, slug });
  }
  return createProductFeature({ ...fields, slug });
}
