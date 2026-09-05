import { v4 as uuidv4 } from 'uuid';
import { query, isPgEnabled } from '../../server/db/pg.js';

export function rowToBrandifyOutput(row) {
  if (!row) return null;
  const toIso = (value) => {
    if (value == null) return null;
    if (value instanceof Date) return value.toISOString();
    return value;
  };
  return {
    id: row.id,
    contentItemId: row.content_item_id,
    pipelineRunId: row.pipeline_run_id,
    sessionId: row.session_id,
    templateId: row.template_id,
    status: row.status,
    isCurrent: Boolean(row.is_current),
    label: row.label,
    originalImageUrl: row.original_image_url,
    mediaUrl: row.media_url,
    engineUsed: row.engine_used,
    strategy: row.strategy ?? null,
    choices: row.choices ?? [],
    draftSelections: row.draft_selections ?? {},
    error: row.error ?? null,
    brandifyError: row.brandify_error ?? null,
    customTarget: row.custom_target ?? null,
    feedback: row.feedback ?? null,
    metadata: row.metadata ?? {},
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

/** Compact list for embedding on content.metadata.brandify_outputs */
export function summarizeOutput(out) {
  if (!out) return null;
  return {
    id: out.id,
    sessionId: out.sessionId,
    templateId: out.templateId,
    status: out.status,
    isCurrent: out.isCurrent,
    label: out.label,
    mediaUrl: out.mediaUrl,
    originalImageUrl: out.originalImageUrl,
    engineUsed: out.engineUsed,
    choices: out.choices,
    error: out.error || out.brandifyError || null,
    createdAt: out.createdAt,
    updatedAt: out.updatedAt,
  };
}

export async function listBrandifyOutputsByContentItem(contentItemId) {
  if (!isPgEnabled() || !contentItemId) return [];
  const result = await query(
    `SELECT * FROM cmo_brandify_outputs
     WHERE content_item_id = $1
     ORDER BY created_at DESC`,
    [contentItemId],
  );
  return (result?.rows || []).map(rowToBrandifyOutput);
}

export async function listBrandifyOutputsByPipeline(pipelineRunId) {
  if (!isPgEnabled() || !pipelineRunId) return [];
  const result = await query(
    `SELECT * FROM cmo_brandify_outputs
     WHERE pipeline_run_id = $1
     ORDER BY created_at DESC`,
    [pipelineRunId],
  );
  return (result?.rows || []).map(rowToBrandifyOutput);
}

export async function findBrandifyOutput(id) {
  if (!isPgEnabled() || !id) return null;
  const result = await query(
    `SELECT * FROM cmo_brandify_outputs WHERE id = $1`,
    [id],
  );
  return rowToBrandifyOutput(result?.rows?.[0]);
}

export async function findCurrentBrandifyOutput(contentItemId) {
  if (!isPgEnabled() || !contentItemId) return null;
  const result = await query(
    `SELECT * FROM cmo_brandify_outputs
     WHERE content_item_id = $1 AND is_current = TRUE
     ORDER BY updated_at DESC
     LIMIT 1`,
    [contentItemId],
  );
  return rowToBrandifyOutput(result?.rows?.[0]);
}

export async function createBrandifyOutput(fields = {}) {
  const id = fields.id || uuidv4();
  if (!isPgEnabled()) {
    return rowToBrandifyOutput({
      id,
      content_item_id: fields.contentItemId,
      pipeline_run_id: fields.pipelineRunId || null,
      session_id: fields.sessionId || null,
      template_id: fields.templateId || null,
      status: fields.status || 'incomplete',
      is_current: Boolean(fields.isCurrent),
      label: fields.label || null,
      original_image_url: fields.originalImageUrl || null,
      media_url: fields.mediaUrl || null,
      engine_used: fields.engineUsed || null,
      strategy: fields.strategy || null,
      choices: fields.choices || [],
      draft_selections: fields.draftSelections || {},
      error: fields.error || null,
      brandify_error: fields.brandifyError || null,
      custom_target: fields.customTarget || null,
      feedback: fields.feedback || null,
      metadata: fields.metadata || {},
      created_at: new Date(),
      updated_at: new Date(),
    });
  }

  const result = await query(
    `INSERT INTO cmo_brandify_outputs (
      id, content_item_id, pipeline_run_id, session_id, template_id,
      status, is_current, label, original_image_url, media_url, engine_used,
      strategy, choices, draft_selections, error, brandify_error,
      custom_target, feedback, metadata
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13::jsonb,$14::jsonb,$15,$16,$17,$18,$19::jsonb
    )
    RETURNING *`,
    [
      id,
      fields.contentItemId,
      fields.pipelineRunId || null,
      fields.sessionId || null,
      fields.templateId || null,
      fields.status || 'incomplete',
      Boolean(fields.isCurrent),
      fields.label || null,
      fields.originalImageUrl || null,
      fields.mediaUrl || null,
      fields.engineUsed || null,
      JSON.stringify(fields.strategy ?? null),
      JSON.stringify(fields.choices ?? []),
      JSON.stringify(fields.draftSelections ?? {}),
      fields.error || null,
      fields.brandifyError || null,
      fields.customTarget || null,
      fields.feedback || null,
      JSON.stringify(fields.metadata ?? {}),
    ],
  );
  return rowToBrandifyOutput(result?.rows?.[0]);
}

export async function updateBrandifyOutput(id, patch = {}) {
  if (!isPgEnabled() || !id) return null;
  const map = {
    sessionId: 'session_id',
    templateId: 'template_id',
    status: 'status',
    isCurrent: 'is_current',
    label: 'label',
    originalImageUrl: 'original_image_url',
    mediaUrl: 'media_url',
    engineUsed: 'engine_used',
    strategy: 'strategy',
    choices: 'choices',
    draftSelections: 'draft_selections',
    error: 'error',
    brandifyError: 'brandify_error',
    customTarget: 'custom_target',
    feedback: 'feedback',
    metadata: 'metadata',
  };
  const jsonCols = new Set(['strategy', 'choices', 'draft_selections', 'metadata']);
  const sets = [];
  const params = [];
  let i = 1;
  for (const [camel, col] of Object.entries(map)) {
    if (patch[camel] === undefined) continue;
    sets.push(`${col} = $${i++}`);
    const val = patch[camel];
    params.push(jsonCols.has(col) ? JSON.stringify(val ?? (col === 'choices' ? [] : {})) : val);
  }
  if (!sets.length) return findBrandifyOutput(id);
  sets.push('updated_at = NOW()');
  params.push(id);
  const result = await query(
    `UPDATE cmo_brandify_outputs SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
    params,
  );
  return rowToBrandifyOutput(result?.rows?.[0]);
}

/** Mark one output current; clear siblings. Returns the current output. */
export async function setCurrentBrandifyOutput(contentItemId, outputId) {
  if (!isPgEnabled() || !contentItemId || !outputId) return null;
  await query(
    `UPDATE cmo_brandify_outputs
     SET is_current = FALSE, updated_at = NOW()
     WHERE content_item_id = $1 AND is_current = TRUE AND id <> $2`,
    [contentItemId, outputId],
  );
  const result = await query(
    `UPDATE cmo_brandify_outputs
     SET is_current = TRUE, updated_at = NOW()
     WHERE id = $1 AND content_item_id = $2
     RETURNING *`,
    [outputId, contentItemId],
  );
  return rowToBrandifyOutput(result?.rows?.[0]);
}

export async function clearCurrentBrandifyOutputs(contentItemId) {
  if (!isPgEnabled() || !contentItemId) return;
  await query(
    `UPDATE cmo_brandify_outputs
     SET is_current = FALSE, updated_at = NOW()
     WHERE content_item_id = $1 AND is_current = TRUE`,
    [contentItemId],
  );
}
