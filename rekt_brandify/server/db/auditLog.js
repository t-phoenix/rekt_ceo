import { query } from './pg.js';

export async function insertApiRequestLog({
  route,
  method,
  statusCode,
  sessionId,
  runId,
  creatorWallet,
  payment,
  requestSummary,
  responseSummary,
  latencyMs,
  userAgent,
}) {
  return query(
    `INSERT INTO brandify_api_request_log (
      route, method, status_code, session_id, run_id, creator_wallet,
      payment, request_summary, response_summary, latency_ms, user_agent
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING id`,
    [
      route,
      method,
      statusCode ?? null,
      sessionId || null,
      runId || null,
      creatorWallet || null,
      payment ? JSON.stringify(payment) : null,
      JSON.stringify(requestSummary || {}),
      responseSummary ? JSON.stringify(responseSummary) : null,
      latencyMs ?? null,
      userAgent || null,
    ]
  );
}

export async function getApiRequestLog(id) {
  const result = await query(
    'SELECT * FROM brandify_api_request_log WHERE id = $1',
    [id]
  );
  return result?.rows?.[0] || null;
}
