import {
  fetchTwitterProfile,
  fetchTwitterUserTweets,
  lightreelScriptIdeas,
} from './agentcash-client.js';
import { fetchCampaignContextForPrompt } from './campaigns-context.js';
import { createStrategyRun } from '../db/strategyRuns.js';
import { listKolWatchlist, upsertKolWatchlist, updateKolFetchMeta } from '../db/kolWatchlist.js';
import { STRATEGY_PROMPT } from './config.js';

function normalizeHandle(h) {
  return String(h).replace(/^@/, '').trim();
}

export async function discoverKols({
  handles = [],
  niche = 'crypto CT memecoin',
  pipelineRunId = null,
} = {}) {
  const campaign = await fetchCampaignContextForPrompt();
  const results = [];

  for (const raw of handles) {
    const handle = normalizeHandle(raw);
    let profile = null;
    let tweets = null;
    try {
      profile = await fetchTwitterProfile(handle);
      tweets = await fetchTwitterUserTweets(handle);
    } catch (err) {
      results.push({ handle: `@${handle}`, error: err.message });
      continue;
    }

    const plan = {
      handle: `@${handle}`,
      compatibility_score: 75,
      engagement_strategy: 'Reply to hot takes within 2h with meme or sharp CT take; never direct shill',
      recommended_actions: [
        {
          action: 'reply',
          timing: 'within 2h of post',
          attach_meme: true,
          risk_level: 'low',
        },
      ],
      profile,
      recent_tweets: tweets,
    };

    await upsertKolWatchlist({
      handle,
      tier: 'B',
      compatibility_score: plan.compatibility_score,
      engagement_notes: plan,
    });

    results.push(plan);
  }

  const run = await createStrategyRun({
    type: 'kol_plan',
    input: { handles, niche, pipelineId: pipelineRunId },
    output: { kols: results, campaign_context: campaign, strategy_prompt: STRATEGY_PROMPT },
    costUsd: 0.15,
    pipelineRunId,
  });

  return { kols: results, run_id: run.id, campaign_context: campaign };
}

export async function getKolOpportunities({ limit = 10 } = {}) {
  const watchlist = await listKolWatchlist();
  const opportunities = [];

  for (const kol of watchlist.slice(0, limit)) {
    try {
      const tweets = await fetchTwitterUserTweets(kol.handle);
      const items = tweets?.tweets || tweets?.data || tweets || [];
      const arr = Array.isArray(items) ? items : [];
      const latest = arr[0];
      if (latest) {
        opportunities.push({
          handle: `@${kol.handle}`,
          tier: kol.tier,
          target_post_url: latest.url || latest.id || null,
          post_text: latest.text || latest.full_text || '',
          suggested_action: 'reply_with_meme',
          draft_reply: `This is the way. ${STRATEGY_PROMPT.slice(0, 80)}...`,
        });
        await updateKolFetchMeta(kol.handle, kol.platform, {
          lastPostId: latest.id || latest.tweet_id || null,
        });
      }
    } catch (err) {
      opportunities.push({ handle: `@${kol.handle}`, error: err.message });
    }
  }

  return { opportunities, count: opportunities.length };
}

export async function draftContentFromTopic({
  topic,
  platform = 'twitter',
  prompt = null,
  strategyContext = null,
  researchContext = null,
}) {
  const campaign = await fetchCampaignContextForPrompt();
  const effectiveTopic = prompt
    ? `${topic}\n\nPrompt:\n${String(prompt).slice(0, 2000)}`
    : topic;

  let ideas = null;
  try {
    ideas = await lightreelScriptIdeas({
      topic: effectiveTopic,
      platform,
      brand: 'Rekt CEO',
      goal: 'maximum engagement and meme UGC',
      strategy_context: strategyContext || undefined,
      research_context: researchContext || undefined,
    });
  } catch (err) {
    ideas = { error: err.message };
  }

  const hashtags = (campaign.hashtags || strategyContext?.hashtags || []).join(' ');
  const ctaLine = strategyContext?.cta
    || `Make your meme: ${process.env.CMO_MEME_GEN_URL || 'https://rektceo.com/memes'}`;
  const launchLine = `Launch missions: ${process.env.CMO_LAUNCH_URL || 'https://rektceo.com/launch'}`;

  // Prefer Lightreel script text when present
  const scriptText =
    ideas?.script
    || ideas?.text
    || ideas?.caption
    || (Array.isArray(ideas?.ideas) ? ideas.ideas[0]?.text : null)
    || topic;

  const body = [
    scriptText,
    '',
    ctaLine,
    launchLine,
    hashtags,
  ].filter(Boolean).join('\n');

  return {
    platform,
    body_text: body,
    hashtags: campaign.hashtags || strategyContext?.hashtags || [],
    lightreel_ideas: ideas,
    campaign_context: campaign,
    prompt_used: prompt || null,
  };
}
