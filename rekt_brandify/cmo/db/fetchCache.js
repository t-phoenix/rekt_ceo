import { query, isPgEnabled } from '../../server/db/pg.js';

export async function getCached(key) {
  if (!isPgEnabled()) return null;
  const result = await query(
    `SELECT response, fetched_at, ttl_seconds FROM cmo_fetch_cache WHERE cache_key = $1`,
    [key],
  );
  if (!result?.rows?.[0]) return null;
  const row = result.rows[0];
  const ageSec = (Date.now() - new Date(row.fetched_at).getTime()) / 1000;
  if (ageSec > row.ttl_seconds) return null;
  return row.response;
}

export async function setCache(key, { provider, endpoint, response, ttlSeconds, costUsd }) {
  if (!isPgEnabled()) return;
  await query(
    `INSERT INTO cmo_fetch_cache (cache_key, provider, endpoint, response, ttl_seconds, cost_usd)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (cache_key) DO UPDATE SET
       response = EXCLUDED.response,
       fetched_at = NOW(),
       ttl_seconds = EXCLUDED.ttl_seconds,
       cost_usd = EXCLUDED.cost_usd`,
    [key, provider, endpoint, JSON.stringify(response), ttlSeconds, costUsd ?? null],
  );
}
