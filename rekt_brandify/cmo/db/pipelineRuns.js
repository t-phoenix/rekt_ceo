import { v4 as uuidv4 } from 'uuid';
import { query, isPgEnabled } from '../../server/db/pg.js';

const MEMORY = new Map();

function defaultSteps(researchConfig = {}) {
  return [
    {
      id: 'research',
      label: 'Research',
      status: 'ready',
      config: researchConfig,
      autoPrompt: null,
      promptEditable: null,
      runIds: [],
      error: null,
    },
    {
      id: 'strategy',
      label: 'Strategy',
      status: 'idle',
      config: { days: researchConfig.days || Number(process.env.CMO_DEFAULT_DAYS || 7) },
      autoPrompt: null,
      promptEditable: null,
      runIds: [],
      error: null,
    },
    {
      id: 'content',
      label: 'Content',
      status: 'idle',
      config: {},
      autoPrompt: null,
      promptEditable: null,
      contentPrompts: [],
      runIds: [],
      contentIds: [],
      error: null,
    },
    {
      id: 'schedule',
      label: 'Schedule',
      status: 'idle',
      config: {},
      autoPrompt: null,
      promptEditable: null,
      error: null,
    },
  ];
}

export async function createPipelineRun({ mode = 'manual', research = {}, preset = 'engagement_ugc' } = {}) {
  const id = uuidv4();
  const days = Number(research.days || process.env.CMO_DEFAULT_DAYS || 7);
  const steps = defaultSteps({
    handles: research.handles || ['rekt_ceo'],
    topic: research.topic || 'Rekt CEO meme season',
    includeCompetition: research.includeCompetition !== false,
    includeTrends: research.includeTrends !== false,
    includeKol: Boolean(research.includeKol),
    includeTopics: research.includeTopics !== false,
    includeSocialPulse: Boolean(research.includeSocialPulse),
    includeNewsEvents: research.includeNewsEvents !== false,
    includeIntelPack: Boolean(research.includeIntelPack),
    days,
  });
  const row = {
    id,
    preset,
    mode: mode === 'auto' ? 'auto' : 'manual',
    status: 'running',
    current_step: 0,
    steps,
    outputs: {},
    metadata: {},
    error: null,
    error_step: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (!isPgEnabled()) {
    MEMORY.set(id, row);
    return row;
  }

  try {
    const result = await query(
      `INSERT INTO cmo_pipeline_runs (id, preset, status, current_step, steps, outputs, mode, error, error_step, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        id,
        preset,
        row.status,
        0,
        JSON.stringify(steps),
        JSON.stringify({}),
        row.mode,
        null,
        null,
        JSON.stringify({}),
      ],
    );
    return normalize(result?.rows?.[0] || row);
  } catch (err) {
    // Pre-008 schemas lack metadata column
    if (!String(err?.message || '').includes('metadata')) throw err;
    const result = await query(
      `INSERT INTO cmo_pipeline_runs (id, preset, status, current_step, steps, outputs, mode, error, error_step)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        id,
        preset,
        row.status,
        0,
        JSON.stringify(steps),
        JSON.stringify({}),
        row.mode,
        null,
        null,
      ],
    );
    return normalize(result?.rows?.[0] || row);
  }
}

export async function getPipelineRun(id) {
  if (!isPgEnabled()) return MEMORY.get(id) || null;
  const result = await query(`SELECT * FROM cmo_pipeline_runs WHERE id = $1`, [id]);
  return result?.rows?.[0] ? normalize(result.rows[0]) : null;
}

export async function listPipelineRuns({ limit = 40, status = null } = {}) {
  if (!isPgEnabled()) {
    return [...MEMORY.values()]
      .sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')))
      .slice(0, limit);
  }
  const params = [];
  let sql = `SELECT * FROM cmo_pipeline_runs`;
  if (status) {
    params.push(status);
    sql += ` WHERE status = $1`;
  }
  params.push(Math.min(Math.max(Number(limit) || 40, 1), 100));
  sql += ` ORDER BY updated_at DESC NULLS LAST, created_at DESC LIMIT $${params.length}`;
  const result = await query(sql, params);
  return (result?.rows || []).map(normalize);
}

export async function updatePipelineRun(id, patch) {
  const existing = await getPipelineRun(id);
  if (!existing) return null;

  const next = {
    ...existing,
    ...patch,
    steps: patch.steps !== undefined ? patch.steps : existing.steps,
    outputs: patch.outputs !== undefined ? patch.outputs : existing.outputs,
    metadata: patch.metadata !== undefined
      ? { ...(existing.metadata || {}), ...(patch.metadata || {}) }
      : (existing.metadata || {}),
    updated_at: new Date().toISOString(),
  };

  if (!isPgEnabled()) {
    MEMORY.set(id, next);
    return next;
  }

  try {
    const result = await query(
      `UPDATE cmo_pipeline_runs SET
        status = $2,
        current_step = $3,
        steps = $4,
        outputs = $5,
        mode = $6,
        error = $7,
        error_step = $8,
        metadata = $9,
        updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [
        id,
        next.status,
        next.current_step ?? existing.current_step,
        JSON.stringify(next.steps),
        JSON.stringify(next.outputs || {}),
        next.mode || existing.mode,
        next.error ?? null,
        next.error_step ?? null,
        JSON.stringify(next.metadata || {}),
      ],
    );
    return result?.rows?.[0] ? normalize(result.rows[0]) : next;
  } catch (err) {
    if (!String(err?.message || '').includes('metadata')) throw err;
    const result = await query(
      `UPDATE cmo_pipeline_runs SET
        status = $2,
        current_step = $3,
        steps = $4,
        outputs = $5,
        mode = $6,
        error = $7,
        error_step = $8,
        updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [
        id,
        next.status,
        next.current_step ?? existing.current_step,
        JSON.stringify(next.steps),
        JSON.stringify(next.outputs || {}),
        next.mode || existing.mode,
        next.error ?? null,
        next.error_step ?? null,
      ],
    );
    return result?.rows?.[0] ? normalize(result.rows[0]) : next;
  }
}

function normalize(row) {
  if (!row) return null;
  return {
    ...row,
    steps: typeof row.steps === 'string' ? JSON.parse(row.steps) : row.steps,
    outputs: typeof row.outputs === 'string' ? JSON.parse(row.outputs) : row.outputs,
    metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : (row.metadata || {}),
  };
}

/**
 * Full session snapshot for admin: pipeline + live content drafts + linked strategy runs.
 */
export async function getPipelineSession(id) {
  const pipeline = await getPipelineRun(id);
  if (!pipeline) return null;

  const { listContentItems } = await import('./contentItems.js');
  const { listStrategyRuns } = await import('./strategyRuns.js');

  const [contentItems, strategyRuns] = await Promise.all([
    listContentItems({ pipelineRunId: id, limit: 100 }),
    listStrategyRuns({ pipelineRunId: id, limit: 100 }),
  ]);

  const outputs = {
    ...(pipeline.outputs || {}),
    contentItems: contentItems.length
      ? contentItems
      : (pipeline.outputs?.contentItems || []),
    contentIds: contentItems.length
      ? contentItems.map((c) => c.id)
      : (pipeline.outputs?.contentIds || []),
  };

  return {
    ...pipeline,
    outputs,
    contentItems,
    strategyRuns,
    session: {
      pipeline_id: id,
      research: outputs.research || null,
      strategy: outputs.strategy || null,
      content_count: contentItems.length,
      run_count: strategyRuns.length,
      scheduled: outputs.scheduled || [],
    },
  };
}

/**
 * Refresh pipeline.outputs.contentItems from live DB rows (keeps Supabase session complete).
 */
export async function syncPipelineContentSnapshot(pipelineId) {
  if (!pipelineId) return null;
  const existing = await getPipelineRun(pipelineId);
  if (!existing) return null;
  const { listContentItems } = await import('./contentItems.js');
  const contentItems = await listContentItems({ pipelineRunId: pipelineId, limit: 100 });
  return updatePipelineRun(pipelineId, {
    outputs: {
      ...(existing.outputs || {}),
      contentItems,
      contentIds: contentItems.map((c) => c.id),
    },
    metadata: {
      ...(existing.metadata || {}),
      last_content_sync_at: new Date().toISOString(),
    },
  });
}

export { defaultSteps };
