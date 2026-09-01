import { v4 as uuidv4 } from 'uuid';
import { query } from './pg.js';

export async function createCaptionRun({
  runId,
  creatorWallet,
  templateId,
  category,
  templateImageUrl,
  input,
  payment,
}) {
  return query(
    `INSERT INTO brandify_caption_runs
      (id, status, creator_wallet, template_id, category, template_image_url, input, payment)
     VALUES ($1, 'running', $2, $3, $4, $5, $6, $7)`,
    [
      runId,
      creatorWallet || null,
      templateId || null,
      category || null,
      templateImageUrl || null,
      JSON.stringify(input || {}),
      payment ? JSON.stringify(Array.isArray(payment) ? payment : [payment]) : null,
    ]
  );
}

export async function completeCaptionRun(runId, { error, responseMetadata } = {}) {
  return query(
    `UPDATE brandify_caption_runs
     SET status = $2,
         error = $3,
         response_metadata = COALESCE($4::jsonb, response_metadata),
         completed_at = NOW()
     WHERE id = $1`,
    [
      runId,
      error ? 'failed' : 'complete',
      error || null,
      responseMetadata ? JSON.stringify(responseMetadata) : null,
    ]
  );
}

export async function updateCaptionRunPayment(runId, paymentMeta) {
  return query(
    `UPDATE brandify_caption_runs
     SET payment = COALESCE(payment, '[]'::jsonb) || $2::jsonb
     WHERE id = $1`,
    [runId, JSON.stringify([paymentMeta])]
  );
}

export async function insertCaptionStage({ runId, stage, model, latencyMs, input, output }) {
  return query(
    `INSERT INTO brandify_caption_stages (id, run_id, stage, model, latency_ms, input, output)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      uuidv4(),
      runId,
      stage,
      model || null,
      latencyMs ?? null,
      input ? JSON.stringify(input) : null,
      output ? JSON.stringify(output) : null,
    ]
  );
}

export async function insertCaptionCandidates(runId, candidates) {
  for (const cand of candidates) {
    await query(
      `INSERT INTO brandify_caption_candidates
        (id, run_id, top_text, bottom_text, humor_tag, intensity, memetic_devices,
         scores, ranking_score, rank, why_funny, returned_to_user)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (run_id, id) DO UPDATE SET
         ranking_score = EXCLUDED.ranking_score,
         rank = EXCLUDED.rank,
         returned_to_user = EXCLUDED.returned_to_user`,
      [
        cand.id,
        runId,
        cand.top_text || '',
        cand.bottom_text || '',
        cand.humor_tag || cand.humor_pattern_used || null,
        cand.intensity || null,
        cand.memetic_devices || [],
        cand.scores ? JSON.stringify(cand.scores) : null,
        cand.ranking_score ?? null,
        cand.rank ?? null,
        cand.why_funny || null,
        Boolean(cand.returned_to_user),
      ]
    );
  }
}

export async function insertCaptionFeedback({
  runId,
  selectedCandidateId,
  rating,
  feedbackText,
  creatorWallet,
}) {
  return query(
    `INSERT INTO brandify_caption_feedback
      (run_id, selected_candidate_id, rating, feedback_text, creator_wallet)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      runId,
      selectedCandidateId || null,
      rating,
      feedbackText || null,
      creatorWallet || null,
    ]
  );
}

export async function getCaptionRun(runId) {
  const result = await query('SELECT * FROM brandify_caption_runs WHERE id = $1', [runId]);
  return result?.rows?.[0] || null;
}

export async function listCaptionStages(runId) {
  const result = await query(
    `SELECT * FROM brandify_caption_stages
     WHERE run_id = $1
     ORDER BY created_at ASC`,
    [runId]
  );
  return result?.rows || [];
}
