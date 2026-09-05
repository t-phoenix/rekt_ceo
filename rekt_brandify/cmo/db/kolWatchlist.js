import { query, isPgEnabled } from '../../server/db/pg.js';

export async function listKolWatchlist() {
  if (!isPgEnabled()) return [];
  const result = await query(
    `SELECT * FROM cmo_kol_watchlist ORDER BY compatibility_score DESC NULLS LAST, handle ASC`,
  );
  return result?.rows || [];
}

export async function upsertKolWatchlist(entry) {
  if (!isPgEnabled()) return entry;
  const handle = entry.handle.replace(/^@/, '');
  const result = await query(
    `INSERT INTO cmo_kol_watchlist (handle, platform, tier, compatibility_score, engagement_notes)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (handle, platform) DO UPDATE SET
       tier = EXCLUDED.tier,
       compatibility_score = EXCLUDED.compatibility_score,
       engagement_notes = EXCLUDED.engagement_notes
     RETURNING *`,
    [
      handle,
      entry.platform || 'twitter',
      entry.tier || 'C',
      entry.compatibility_score ?? null,
      JSON.stringify(entry.engagement_notes || {}),
    ],
  );
  return result?.rows?.[0];
}

export async function updateKolFetchMeta(handle, platform, { lastPostId }) {
  if (!isPgEnabled()) return;
  await query(
    `UPDATE cmo_kol_watchlist SET last_fetched_at = NOW(), last_post_id = $3
     WHERE handle = $1 AND platform = $2`,
    [handle.replace(/^@/, ''), platform || 'twitter', lastPostId || null],
  );
}
