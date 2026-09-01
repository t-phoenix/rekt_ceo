import { query, isPgEnabled, getPool } from './pg.js';

/** Serialize Postgres row → API shape matching legacy MongoDB Session documents. */
export function rowToSession(row) {
  if (!row) return null;

  const toIso = (value) => {
    if (value == null) return null;
    if (value instanceof Date) return value.toISOString();
    return value;
  };

  return {
    sessionId: row.session_id,
    timestamp: toIso(row.created_at),
    originalImageUrl: row.original_image_url,
    generatedImageUrl: row.generated_image_url ?? null,
    userCustomTarget: row.user_custom_target ?? null,
    aiVisionRaw: row.ai_vision_raw ?? null,
    userCuratedChoices: row.user_curated_choices ?? [],
    compiledPrompt: row.compiled_prompt ?? null,
    engineUsed: row.engine_used ?? null,
    jobId: row.job_id ?? null,
    userRating: row.user_rating ?? null,
    templateId: row.template_id ?? null,
    category: row.category ?? null,
    templateFilename: row.template_filename ?? null,
    creatorWallet: row.creator_wallet ?? null,
    isPublic: row.is_public ?? true,
    publishedAt: toIso(row.published_at),
    error: row.error ?? null,
  };
}

function variationItemFromRow(row) {
  const toIso = (value) => {
    if (value == null) return null;
    if (value instanceof Date) return value.toISOString();
    return value;
  };

  return {
    sessionId: row.session_id,
    generatedImageUrl: row.generated_image_url,
    originalImageUrl: row.original_image_url,
    userRating: row.user_rating ?? null,
    timestamp: toIso(row.created_at),
    publishedAt: toIso(row.published_at),
  };
}

async function queryOrThrow(text, params) {
  const pool = getPool();
  if (!pool) {
    throw new Error('Database unavailable — set DATABASE_URL');
  }
  try {
    return await pool.query(text, params);
  } catch (err) {
    console.error('Postgres query error:', err.message);
    throw err;
  }
}

export async function createSession({
  sessionId,
  originalImageUrl,
  userCustomTarget,
  templateId,
  category,
  templateFilename,
  creatorWallet,
}) {
  const result = await queryOrThrow(
    `INSERT INTO brandify_sessions (
      session_id, original_image_url, user_custom_target,
      template_id, category, template_filename, creator_wallet
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *`,
    [
      sessionId,
      originalImageUrl,
      userCustomTarget || null,
      templateId || null,
      category || null,
      templateFilename || null,
      creatorWallet || null,
    ]
  );
  return rowToSession(result.rows[0]);
}

export async function findSession(sessionId) {
  const result = await query(
    'SELECT * FROM brandify_sessions WHERE session_id = $1',
    [sessionId]
  );
  return rowToSession(result?.rows?.[0]);
}

export async function updateSessionVision(sessionId, aiVisionRaw) {
  const result = await queryOrThrow(
    `UPDATE brandify_sessions
     SET ai_vision_raw = $2::jsonb, updated_at = NOW()
     WHERE session_id = $1
     RETURNING *`,
    [sessionId, JSON.stringify(aiVisionRaw ?? null)]
  );
  return rowToSession(result.rows[0]);
}

export async function updateSessionGenerationPrep(sessionId, userCuratedChoices, compiledPrompt) {
  const result = await queryOrThrow(
    `UPDATE brandify_sessions
     SET user_curated_choices = $2::jsonb,
         compiled_prompt = $3,
         updated_at = NOW()
     WHERE session_id = $1
     RETURNING *`,
    [sessionId, JSON.stringify(userCuratedChoices ?? []), compiledPrompt]
  );
  return rowToSession(result.rows[0]);
}

export async function updateSessionJobId(sessionId, jobId) {
  await queryOrThrow(
    `UPDATE brandify_sessions SET job_id = $2, updated_at = NOW() WHERE session_id = $1`,
    [sessionId, jobId]
  );
}

export async function updateSessionGenerated(sessionId, {
  engineUsed,
  generatedImageUrl,
  isPublic = true,
}) {
  const result = await queryOrThrow(
    `UPDATE brandify_sessions
     SET engine_used = $2,
         generated_image_url = $3,
         is_public = $4,
         published_at = NOW(),
         updated_at = NOW()
     WHERE session_id = $1
     RETURNING *`,
    [sessionId, engineUsed, generatedImageUrl, isPublic]
  );
  return rowToSession(result.rows[0]);
}

export async function updateSessionError(sessionId, error) {
  await queryOrThrow(
    `UPDATE brandify_sessions SET error = $2, updated_at = NOW() WHERE session_id = $1`,
    [sessionId, error]
  );
}

export async function rateSession(sessionId, rating) {
  const result = await queryOrThrow(
    `UPDATE brandify_sessions
     SET user_rating = $2, updated_at = NOW()
     WHERE session_id = $1
     RETURNING *`,
    [sessionId, rating]
  );
  return rowToSession(result.rows[0]);
}

export async function listPublicVariations(templateId, { limit, offset }) {
  const countResult = await query(
    `SELECT COUNT(*)::int AS total
     FROM brandify_sessions
     WHERE template_id = $1
       AND is_public = TRUE
       AND generated_image_url IS NOT NULL
       AND error IS NULL`,
    [templateId]
  );

  const itemsResult = await query(
    `SELECT session_id, generated_image_url, original_image_url,
            user_rating, created_at, published_at
     FROM brandify_sessions
     WHERE template_id = $1
       AND is_public = TRUE
       AND generated_image_url IS NOT NULL
       AND error IS NULL
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [templateId, limit, offset]
  );

  const total = countResult?.rows?.[0]?.total ?? 0;
  const items = (itemsResult?.rows || []).map(variationItemFromRow);

  return { total, items };
}

export { isPgEnabled };

/** Field names expected by API clients (legacy MongoDB Session parity). */
export const SESSION_API_FIELDS = [
  'sessionId',
  'timestamp',
  'originalImageUrl',
  'generatedImageUrl',
  'userCustomTarget',
  'aiVisionRaw',
  'userCuratedChoices',
  'compiledPrompt',
  'engineUsed',
  'jobId',
  'userRating',
  'templateId',
  'category',
  'templateFilename',
  'creatorWallet',
  'isPublic',
  'publishedAt',
  'error',
];

export const VARIATION_API_FIELDS = [
  'sessionId',
  'generatedImageUrl',
  'originalImageUrl',
  'userRating',
  'timestamp',
  'publishedAt',
];
