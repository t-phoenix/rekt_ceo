import { v4 as uuidv4 } from 'uuid';
import {
  fetchTwitterUserTweets,
  lightreelCompetitorStrategy,
  redditSearch,
} from './agentcash-client.js';
import { fetchCampaignContextForPrompt } from './campaigns-context.js';
import { getCached, setCache } from '../db/fetchCache.js';
import { createStrategyRun } from '../db/strategyRuns.js';
import { getCmoConfig, STRATEGY_PROMPT } from './config.js';

function normalizeHandle(h) {
  return String(h).replace(/^@/, '').trim();
}

export async function runCompetitionResearch({
  handles = [],
  includeReddit = true,
  depth = 'basic',
  forceRefresh = false,
  pipelineRunId = null,
} = {}) {
  const cfg = getCmoConfig();
  const normalized = handles.map(normalizeHandle).filter(Boolean);
  const cacheKey = `competition:${normalized.join(',')}:${depth}:${includeReddit}`;

  if (!forceRefresh) {
    const cached = await getCached(cacheKey);
    if (cached) {
      const run = await createStrategyRun({
        type: 'competition_playbook',
        input: { handles: normalized, depth, includeReddit, cached: true, pipelineId: pipelineRunId },
        output: cached,
        cacheKey,
        pipelineRunId,
      });
      return { ...cached, run_id: run.id, from_cache: true };
    }
  }

  const campaign = await fetchCampaignContextForPrompt();
  const competitorPosts = {};

  for (const handle of normalized) {
    try {
      competitorPosts[handle] = await fetchTwitterUserTweets(handle);
    } catch (err) {
      competitorPosts[handle] = { error: err.message };
    }
  }

  let redditThreads = [];
  if (includeReddit) {
    try {
      redditThreads = await redditSearch({
        query: 'Rekt CEO OR memecoin CEO OR $CEO',
        limit: 10,
      });
    } catch (err) {
      redditThreads = { error: err.message };
    }
  }

  let lightreelAnalysis = null;
  try {
    lightreelAnalysis = await lightreelCompetitorStrategy({
      brand: 'Rekt CEO',
      niche: 'crypto memecoin CT',
      competitors: normalized,
      goal: 'maximum engagement and meme UGC',
    });
  } catch (err) {
    lightreelAnalysis = { error: err.message };
  }

  const playbook = {
    competitors: normalized.map((h) => `@${h}`),
    strategy_prompt: STRATEGY_PROMPT,
    campaign_context: campaign,
    launch_hub_cta: `${cfg.launchUrl} — connect wallet + complete X meme mission for XP`,
    meme_gen_cta: cfg.memeGenUrl,
    raw_posts: competitorPosts,
    reddit_threads: redditThreads,
    lightreel_analysis: lightreelAnalysis,
    ugc_tactics: [
      'Run meme challenge when competitor posts product update',
      `Quote-tweet with Rekt meme + link ${cfg.launchUrl}`,
      `Drive users to ${cfg.memeGenUrl} to create branded memes`,
    ],
    engagement_opportunities: normalized.map((h) => ({
      platform: 'twitter',
      handle: `@${h}`,
      why_engage: 'Monitor hot takes; reply with branded meme within 2h',
      suggested_angle: 'Quote-tweet with contrarian CT take + meme',
      priority: 'medium',
    })),
    comment_targets: [],
    generated_at: new Date().toISOString(),
  };

  const ttlSeconds = cfg.competitionCacheTtlHours * 3600;
  await setCache(cacheKey, {
    provider: 'stablesocial',
    endpoint: 'competition',
    response: playbook,
    ttlSeconds,
    costUsd: 0.25,
  });

  const run = await createStrategyRun({
    type: 'competition_playbook',
    input: { handles: normalized, depth, includeReddit, pipelineId: pipelineRunId },
    output: playbook,
    cacheKey,
    expiresAt: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
    costUsd: 0.25,
    pipelineRunId,
  });

  return { ...playbook, run_id: run.id, from_cache: false };
}
