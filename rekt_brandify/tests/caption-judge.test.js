import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeCompositeScore, selectTopCaptions } from '../server/services/captionJudge.js';
import { HUMOR_TAGS, INTENSITY_LEVELS } from '../server/constants/caption.js';

describe('captionJudge', () => {
  it('computeCompositeScore weights criteria correctly', () => {
    const score = computeCompositeScore({
      template_fit: 1,
      context_relevance: 1,
      surprise: 1,
      relatability: 1,
      brevity: 1,
      originality: 1,
    });
    assert.equal(score, 1);

    const partial = computeCompositeScore({
      template_fit: 0.8,
      context_relevance: 0.6,
    });
    assert.ok(partial > 0 && partial < 1);
  });

  it('selectTopCaptions returns top 3 from judge rankings', () => {
    const candidates = [
      { id: 'cand_01', top_text: 'A', bottom_text: 'B', humor_tag: 'sarcasm', intensity: 'medium' },
      { id: 'cand_02', top_text: 'C', bottom_text: 'D', humor_tag: 'reversal', intensity: 'savage' },
      { id: 'cand_03', top_text: 'E', bottom_text: 'F', humor_tag: 'deadpan', intensity: 'mild' },
      { id: 'cand_04', top_text: 'G', bottom_text: 'H', humor_tag: 'callback', intensity: 'medium' },
    ];

    const judgeRanked = [
      {
        id: 'cand_02',
        rank: 1,
        ranking_score: 0.95,
        scores: { template_fit: 0.9, context_relevance: 0.9, surprise: 0.95, relatability: 0.9, brevity: 0.9, originality: 0.9 },
        why_funny: 'Perfect reversal',
      },
      {
        id: 'cand_01',
        rank: 2,
        ranking_score: 0.88,
        scores: { template_fit: 0.85, context_relevance: 0.85, surprise: 0.8, relatability: 0.85, brevity: 0.9, originality: 0.8 },
        why_funny: 'Solid sarcasm',
      },
      {
        id: 'cand_04',
        rank: 3,
        ranking_score: 0.82,
        scores: { template_fit: 0.8, context_relevance: 0.8, surprise: 0.75, relatability: 0.8, brevity: 0.85, originality: 0.75 },
        why_funny: 'Nice callback',
      },
      {
        id: 'cand_03',
        rank: 4,
        ranking_score: 0.7,
        scores: { template_fit: 0.7, context_relevance: 0.7, surprise: 0.6, relatability: 0.7, brevity: 0.8, originality: 0.65 },
        why_funny: 'Too mild',
      },
    ];

    const { top, allRanked } = selectTopCaptions(candidates, judgeRanked);

    assert.equal(top.length, 3);
    assert.equal(top[0].id, 'cand_02');
    assert.equal(top[0].humor_pattern_used, 'reversal');
    assert.equal(allRanked.length, 4);
    assert.equal(allRanked.filter((c) => c.returned_to_user).length, 3);
  });

  it('selectTopCaptions falls back when judge returns empty', () => {
    const candidates = [
      { id: 'cand_01', top_text: 'Hi', bottom_text: 'Bye', humor_tag: 'observational', intensity: 'medium' },
    ];

    const { top } = selectTopCaptions(candidates, []);
    assert.equal(top.length, 1);
    assert.ok(top[0].ranking_score >= 0);
  });
});

describe('caption constants', () => {
  it('humor tags and intensity levels are defined', () => {
    assert.ok(HUMOR_TAGS.includes('sarcasm'));
    assert.ok(HUMOR_TAGS.includes('inside_baseball'));
    assert.deepEqual(INTENSITY_LEVELS, ['mild', 'medium', 'savage']);
  });
});
