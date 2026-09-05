import { v4 as uuidv4 } from 'uuid';
import { query, isPgEnabled } from '../../server/db/pg.js';

export async function listInteractions({ status, platform, limit = 50 } = {}) {
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
  params.push(limit);
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const result = await query(
    `SELECT * FROM cmo_interactions ${where} ORDER BY fetched_at DESC LIMIT $${i}`,
    params,
  );
  return result?.rows || [];
}

export async function createInteraction(fields) {
  const id = uuidv4();
  if (!isPgEnabled()) return { id, ...fields };
  const result = await query(
    `INSERT INTO cmo_interactions (id, platform, type, external_id, author, body, post_url, status, draft_reply, priority)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING *`,
    [
      id,
      fields.platform,
      fields.type,
      fields.external_id || null,
      fields.author || null,
      fields.body || null,
      fields.post_url || null,
      fields.status || 'new',
      fields.draft_reply || null,
      fields.priority || null,
    ],
  );
  return result?.rows?.[0];
}

export async function updateInteraction(id, patch) {
  if (!isPgEnabled()) return null;
  const result = await query(
    `UPDATE cmo_interactions SET status = COALESCE($2, status), draft_reply = COALESCE($3, draft_reply)
     WHERE id = $1 RETURNING *`,
    [id, patch.status ?? null, patch.draft_reply ?? null],
  );
  return result?.rows?.[0] || null;
}
