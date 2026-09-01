import { JUDGE_WEIGHTS, TOP_N } from '../constants/caption.js';

/**
 * Compute composite ranking score from per-criterion scores.
 */
export function computeCompositeScore(scores = {}) {
  let total = 0;
  let weightSum = 0;

  for (const [key, weight] of Object.entries(JUDGE_WEIGHTS)) {
    const value = Number(scores[key]);
    if (Number.isFinite(value)) {
      total += value * weight;
      weightSum += weight;
    }
  }

  return weightSum > 0 ? total / weightSum : 0;
}

/**
 * Merge judge rankings with storm candidates; fallback to heuristic if judge incomplete.
 */
export function selectTopCaptions(candidates, judgeRanked = []) {
  const byId = new Map(candidates.map((c) => [c.id, { ...c }]));
  const ranked = [];

  if (Array.isArray(judgeRanked) && judgeRanked.length > 0) {
    for (const entry of judgeRanked) {
      const base = byId.get(entry.id);
      if (!base) continue;

      const scores = entry.scores || {};
      const rankingScore = Number.isFinite(entry.ranking_score)
        ? entry.ranking_score
        : computeCompositeScore(scores);

      ranked.push({
        ...base,
        scores,
        ranking_score: rankingScore,
        rank: entry.rank ?? ranked.length + 1,
        why_funny: entry.why_funny || base.alignment_note || '',
        humor_pattern_used: base.humor_tag || base.humor_pattern_used,
      });
    }
  }

  if (ranked.length === 0) {
    for (const [idx, cand] of candidates.entries()) {
      const brevity = Math.max(0, 1 - (cand.top_text?.length || 0 + cand.bottom_text?.length || 0) / 120);
      const scores = {
        template_fit: 0.7,
        context_relevance: 0.7,
        surprise: 0.6,
        relatability: 0.65,
        brevity,
        originality: 0.6,
      };
      ranked.push({
        ...cand,
        scores,
        ranking_score: computeCompositeScore(scores),
        rank: idx + 1,
        why_funny: cand.alignment_note || '',
        humor_pattern_used: cand.humor_tag || 'observational',
      });
    }
  }

  ranked.sort((a, b) => {
    if (a.rank != null && b.rank != null) return a.rank - b.rank;
    return (b.ranking_score || 0) - (a.ranking_score || 0);
  });

  ranked.forEach((item, idx) => {
    item.rank = idx + 1;
  });

  const top = ranked.slice(0, TOP_N).map((item) => ({
    id: item.id,
    top_text: item.top_text || '',
    bottom_text: item.bottom_text || '',
    humor_tag: item.humor_tag || item.humor_pattern_used,
    humor_pattern_used: item.humor_tag || item.humor_pattern_used,
    intensity: item.intensity || 'medium',
    memetic_devices: item.memetic_devices || [],
    ranking_score: item.ranking_score,
    scores: item.scores,
    why_funny: item.why_funny,
    rank: item.rank,
  }));

  const allRanked = ranked.map((item, idx) => ({
    ...item,
    rank: idx + 1,
    returned_to_user: idx < TOP_N,
  }));

  return { top, allRanked };
}
