import { v4 as uuidv4 } from 'uuid';
import { query, isPgEnabled } from '../../server/db/pg.js';

function normalizeRun(row) {
  if (!row) return null;
  return {
    ...row,
    input: typeof row.input === 'string' ? JSON.parse(row.input) : row.input,
    output: typeof row.output === 'string' ? JSON.parse(row.output) : row.output,
    error_detail: typeof row.error_detail === 'string' ? JSON.parse(row.error_detail) : row.error_detail,
    metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : (row.metadata || {}),
  };
}

export async function createStrategyRun({
  type,
  input,
  output,
  cacheKey,
  expiresAt,
  costUsd,
  status = 'success',
  errorMessage = null,
  errorDetail = null,
  payerHint = null,
  x402PriceUsd = null,
  pipelineRunId = null,
  metadata = null,
}) {
  const id = uuidv4();
  if (!isPgEnabled()) {
    return {
      id,
      type,
      input,
      output,
      status,
      error_message: errorMessage,
      pipeline_run_id: pipelineRunId,
      metadata: metadata || {},
      created_at: new Date().toISOString(),
    };
  }
  let result = await query(
    `INSERT INTO cmo_strategy_runs
      (id, type, input, output, cache_key, expires_at, agentcash_cost_usd,
       status, error_message, error_detail, payer_hint, x402_price_usd,
       pipeline_run_id, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
     RETURNING *`,
    [
      id,
      type,
      JSON.stringify(input || {}),
      output != null ? JSON.stringify(output) : null,
      cacheKey || null,
      expiresAt || null,
      costUsd ?? null,
      status,
      errorMessage,
      JSON.stringify(errorDetail || {}),
      payerHint || null,
      x402PriceUsd ?? null,
      pipelineRunId || null,
      JSON.stringify(metadata || {}),
    ],
  );
  // pg.js returns null on query errors (e.g. pre-008 schema)
  if (!result?.rows?.[0]) {
    result = await query(
      `INSERT INTO cmo_strategy_runs
        (id, type, input, output, cache_key, expires_at, agentcash_cost_usd,
         status, error_message, error_detail, payer_hint, x402_price_usd)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        id,
        type,
        JSON.stringify(input || {}),
        output != null ? JSON.stringify(output) : null,
        cacheKey || null,
        expiresAt || null,
        costUsd ?? null,
        status,
        errorMessage,
        JSON.stringify(errorDetail || {}),
        payerHint || null,
        x402PriceUsd ?? null,
      ],
    );
  }
  return normalizeRun(result?.rows?.[0]) || { id, type, input, output, status, pipeline_run_id: pipelineRunId };
}

/** Persist a paid-run failure after x402 succeeded but AgentCash/AI processing failed. */
export async function createFailedStrategyRun({
  type,
  input,
  error,
  payerHint = null,
  x402PriceUsd = null,
  costUsd = null,
  pipelineRunId = null,
  metadata = null,
}) {
  const message = error?.message || String(error || 'Unknown error');
  const detail = {
    name: error?.name || 'Error',
    stack: typeof error?.stack === 'string' ? error.stack.slice(0, 4000) : null,
    code: error?.code || null,
    status: error?.status || error?.statusCode || null,
    raw: typeof error === 'object' ? undefined : String(error),
  };

  return createStrategyRun({
    type,
    input,
    output: null,
    status: 'failed',
    errorMessage: message.slice(0, 2000),
    errorDetail: detail,
    payerHint,
    x402PriceUsd,
    costUsd,
    pipelineRunId,
    metadata,
  });
}

export async function listStrategyRuns({
  type,
  status,
  pipelineRunId = null,
  limit = 20,
} = {}) {
  if (!isPgEnabled()) return [];
  const params = [];
  const where = [];
  let sql = `SELECT * FROM cmo_strategy_runs`;

  if (type) {
    params.push(type);
    where.push(`type = $${params.length}`);
  }
  if (status) {
    params.push(status);
    where.push(`status = $${params.length}`);
  }
  if (pipelineRunId) {
    params.push(pipelineRunId);
    where.push(`pipeline_run_id = $${params.length}`);
  }
  if (where.length) sql += ` WHERE ${where.join(' AND ')}`;

  params.push(limit);
  sql += ` ORDER BY created_at DESC LIMIT $${params.length}`;
  const result = await query(sql, params);
  return (result?.rows || []).map(normalizeRun);
}

export async function getStrategyRunById(id) {
  if (!isPgEnabled()) return null;
  const result = await query(`SELECT * FROM cmo_strategy_runs WHERE id = $1`, [id]);
  return normalizeRun(result?.rows?.[0]);
}
