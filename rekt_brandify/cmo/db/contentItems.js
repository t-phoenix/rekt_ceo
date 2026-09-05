import { v4 as uuidv4 } from 'uuid';
import { query, isPgEnabled } from '../../server/db/pg.js';

export async function listContentItems({ status, platform, pipelineRunId, limit = 50 } = {}) {
  if (!isPgEnabled()) return [];
  const clauses = [];
  const params = [];
  let i = 1;
  if (status) {
    clauses.push(`status = $${i++}`);
    params.push(status);
  }
  if (platform) {
    clauses.push(`platform = $${i++}`);
    params.push(platform);
  }
  if (pipelineRunId) {
    clauses.push(`pipeline_run_id = $${i++}`);
    params.push(pipelineRunId);
  }
  params.push(limit);
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const result = await query(
    `SELECT * FROM cmo_content_items ${where} ORDER BY updated_at DESC LIMIT $${i}`,
    params,
  );
  return result?.rows || [];
}

export async function createContentItem(fields) {
  const id = uuidv4();
  if (!isPgEnabled()) return { id, ...fields };
  const result = await query(
    `INSERT INTO cmo_content_items (
      id, status, platform, post_type, deliverable_type, body_text, hashtags,
      media_url, meme_template_id, brandify_session_id, caption_run_id,
      source_research_id, kol_target_handle, scheduled_at, metadata, pipeline_run_id
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
    RETURNING *`,
    [
      id,
      fields.status || 'draft',
      fields.platform || null,
      fields.post_type || 'text',
      fields.deliverable_type || 'social_post',
      fields.body_text || null,
      fields.hashtags || null,
      fields.media_url || null,
      fields.meme_template_id || null,
      fields.brandify_session_id || null,
      fields.caption_run_id || null,
      fields.source_research_id || null,
      fields.kol_target_handle || null,
      fields.scheduled_at || null,
      JSON.stringify(fields.metadata || {}),
      fields.pipeline_run_id || null,
    ],
  );
  return result?.rows?.[0];
}

export async function findContentByPipelineDay(pipelineRunId, suggestedDay) {
  if (!isPgEnabled() || !pipelineRunId) return null;
  const result = await query(
    `SELECT * FROM cmo_content_items
     WHERE pipeline_run_id = $1
       AND (metadata->>'suggested_day')::int = $2
     ORDER BY updated_at DESC
     LIMIT 1`,
    [pipelineRunId, Number(suggestedDay)],
  );
  return result?.rows?.[0] || null;
}

export async function getContentItem(id) {
  if (!isPgEnabled() || !id) return null;
  const result = await query(
    `SELECT * FROM cmo_content_items WHERE id = $1`,
    [id],
  );
  return result?.rows?.[0] || null;
}

export async function updateContentItem(id, patch) {
  if (!isPgEnabled()) return null;
  const allowed = [
    'status', 'body_text', 'hashtags', 'media_url', 'scheduled_at',
    'published_at', 'metadata', 'platform', 'post_type', 'pipeline_run_id',
    'source_research_id', 'meme_template_id', 'brandify_session_id',
    'caption_run_id', 'deliverable_type',
  ];
  const sets = [];
  const params = [];
  let i = 1;
  for (const key of allowed) {
    if (patch[key] !== undefined) {
      sets.push(`${key} = $${i++}`);
      params.push(key === 'metadata' ? JSON.stringify(patch[key]) : patch[key]);
    }
  }
  if (!sets.length) return null;
  sets.push(`updated_at = NOW()`);
  params.push(id);
  const result = await query(
    `UPDATE cmo_content_items SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
    params,
  );
  return result?.rows?.[0] || null;
}

export async function listScheduledInRange(start, end) {
  if (!isPgEnabled()) return [];
  const result = await query(
    `SELECT * FROM cmo_content_items
     WHERE scheduled_at IS NOT NULL AND scheduled_at >= $1 AND scheduled_at <= $2
     ORDER BY scheduled_at ASC`,
    [start, end],
  );
  return result?.rows || [];
}

/** Most-recently used meme template ids (for selection cooldown). */
export async function listRecentMemeTemplateIds(limit = 100) {
  if (!isPgEnabled()) return [];
  const lim = Math.min(Math.max(Number(limit) || 100, 1), 500);
  const result = await query(
    `SELECT meme_template_id
     FROM cmo_content_items
     WHERE meme_template_id IS NOT NULL AND meme_template_id <> ''
     ORDER BY updated_at DESC
     LIMIT $1`,
    [lim],
  );
  const seen = new Set();
  const ids = [];
  for (const row of result?.rows || []) {
    const id = String(row.meme_template_id || '');
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}
