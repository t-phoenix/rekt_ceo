import { v4 as uuidv4 } from 'uuid';
import { query, isPgEnabled } from '../../server/db/pg.js';

const MEMORY = [];

export async function createPromptMemory({
  stage,
  featureId = null,
  originalPrompt = null,
  editedPrompt,
  diffNotes = null,
  accepted = false,
  pipelineRunId = null,
}) {
  const id = uuidv4();
  const row = {
    id,
    stage,
    feature_id: featureId,
    original_prompt: originalPrompt,
    edited_prompt: editedPrompt,
    diff_notes: diffNotes,
    accepted: Boolean(accepted),
    usage_count: 0,
    pipeline_run_id: pipelineRunId,
    created_at: new Date().toISOString(),
  };
  if (!isPgEnabled()) {
    MEMORY.unshift(row);
    return row;
  }
  const result = await query(
    `INSERT INTO cmo_prompt_memory
      (id, stage, feature_id, original_prompt, edited_prompt, diff_notes, accepted, pipeline_run_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING *`,
    [
      id,
      stage,
      featureId,
      originalPrompt,
      editedPrompt,
      diffNotes,
      Boolean(accepted),
      pipelineRunId,
    ],
  );
  return result?.rows?.[0] || row;
}

export async function listPromptMemory({ stage = null, acceptedOnly = false, limit = 30 } = {}) {
  if (!isPgEnabled()) {
    return MEMORY
      .filter((r) => (!stage || r.stage === stage) && (!acceptedOnly || r.accepted))
      .slice(0, limit);
  }
  const params = [];
  const where = [];
  if (stage) {
    params.push(stage);
    where.push(`stage = $${params.length}`);
  }
  if (acceptedOnly) where.push('accepted = TRUE');
  params.push(Math.min(Math.max(Number(limit) || 30, 1), 100));
  let sql = `SELECT * FROM cmo_prompt_memory`;
  if (where.length) sql += ` WHERE ${where.join(' AND ')}`;
  sql += ` ORDER BY created_at DESC LIMIT $${params.length}`;
  const result = await query(sql, params);
  return result?.rows || [];
}

export async function acceptPromptMemory(id, accepted = true) {
  if (!isPgEnabled()) {
    const row = MEMORY.find((r) => r.id === id);
    if (row) row.accepted = Boolean(accepted);
    return row || null;
  }
  const result = await query(
    `UPDATE cmo_prompt_memory SET accepted = $2 WHERE id = $1 RETURNING *`,
    [id, Boolean(accepted)],
  );
  return result?.rows?.[0] || null;
}

export async function bumpPromptMemoryUsage(id) {
  if (!isPgEnabled()) {
    const row = MEMORY.find((r) => r.id === id);
    if (row) row.usage_count = (row.usage_count || 0) + 1;
    return row || null;
  }
  const result = await query(
    `UPDATE cmo_prompt_memory SET usage_count = usage_count + 1 WHERE id = $1 RETURNING *`,
    [id],
  );
  return result?.rows?.[0] || null;
}
