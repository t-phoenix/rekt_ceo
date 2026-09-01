import { v4 as uuidv4 } from 'uuid';
import { query, getPool } from './pg.js';

async function queryOrThrow(text, params) {
  const pool = getPool();
  if (!pool) {
    throw new Error('Database unavailable — set DATABASE_URL');
  }
  const result = await pool.query(text, params);
  return result;
}

export async function insertSessionStage({
  sessionId,
  stage,
  attempt = 1,
  model,
  latencyMs,
  input,
  output,
  error,
}) {
  const result = await queryOrThrow(
    `INSERT INTO brandify_session_stages
      (id, session_id, stage, attempt, model, latency_ms, input, output, error)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      uuidv4(),
      sessionId,
      stage,
      attempt,
      model || null,
      latencyMs ?? null,
      input ? JSON.stringify(input) : null,
      output ? JSON.stringify(output) : null,
      error || null,
    ]
  );
  return result.rows[0];
}

export async function appendSessionPayment(sessionId, paymentMeta) {
  await queryOrThrow(
    `UPDATE brandify_sessions
     SET payment = COALESCE(payment, '[]'::jsonb) || $2::jsonb,
         updated_at = NOW()
     WHERE session_id = $1`,
    [sessionId, JSON.stringify([paymentMeta])]
  );
}

export async function listSessionStages(sessionId) {
  const result = await query(
    `SELECT * FROM brandify_session_stages
     WHERE session_id = $1
     ORDER BY created_at ASC`,
    [sessionId]
  );
  return result?.rows || [];
}
