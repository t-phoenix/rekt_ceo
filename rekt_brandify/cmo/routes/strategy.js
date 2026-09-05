import express from 'express';
import { fetchLaunchHubBootstrap, fetchCampaignContextForPrompt } from '../services/campaigns-context.js';
import { lightreelContentCalendar } from '../services/agentcash-client.js';
import { createContentItem } from '../db/contentItems.js';
import { createStrategyRun, createFailedStrategyRun } from '../db/strategyRuns.js';
import { requireAdmin } from '../middleware/adminAuth.js';
import { getCmoConfig } from '../services/config.js';
import { extractPayerHint, priceForRoute } from '../services/paid-run.js';
import { buildFallbackPostIdeas, summarizeResearch } from '../services/pipeline.js';
import { buildBrandPromptContext } from '../services/brand-context.js';

const router = express.Router();

router.get('/launch-context', requireAdmin, async (_req, res) => {
  try {
    let bootstrap = null;
    let bootstrapError = null;
    try {
      bootstrap = await fetchLaunchHubBootstrap();
    } catch (err) {
      bootstrapError = err.message;
    }
    const campaign = await fetchCampaignContextForPrompt();
    res.json({
      success: true,
      data: {
        bootstrap,
        campaign,
        config: getCmoConfig(),
        bootstrapError,
        campaignsOnline: !bootstrapError,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Paid via x402 — accepts research_context / prompt for pipeline chaining
router.post('/campaign-brief', async (req, res) => {
  const input = req.body || {};
  try {
    const days = Number(input.days || 7);
    const focus = input.focus || 'meme_ugc';
    const researchContext = input.research_context || input.researchContext || null;
    const researchRunIds = input.research_run_ids || input.researchRunIds || [];
    const prompt = input.prompt || null;
    const campaign = await fetchCampaignContextForPrompt();
    const cfg = getCmoConfig();
    const brandCtx = await buildBrandPromptContext({
      featureIds: input.featureIds || input.feature_ids || null,
      stage: 'strategy',
    });
    const enrichedPrompt = [brandCtx.text, prompt].filter(Boolean).join('\n\n') || null;

    let calendar = null;
    try {
      calendar = await lightreelContentCalendar({
        brand: brandCtx.brand?.name || 'Rekt CEO',
        days,
        focus,
        goal: 'maximum engagement and user-generated memes',
        launch_url: cfg.launchUrl,
        meme_url: cfg.memeGenUrl,
        research_summary: researchContext ? summarizeResearch(researchContext) : undefined,
        prompt: enrichedPrompt || undefined,
      });
    } catch (err) {
      calendar = { error: err.message };
    }

    let postIdeas = extractPostIdeasFromCalendar(calendar, days, campaign, cfg);
    if (!postIdeas.length) {
      postIdeas = buildFallbackPostIdeas({
        days,
        campaign,
        cfg,
        researchOutputs: researchContext || {},
      });
    }

    // Apply prompt-driven nuance: if prompt mentions launch vs meme, bias CTAs
    if (prompt && /launch hub|mission|xp/i.test(prompt)) {
      postIdeas = postIdeas.map((idea, i) =>
        i % 2 === 1 ? { ...idea, cta: cfg.launchUrl } : idea,
      );
    }

    const brief = {
      days,
      focus,
      season: campaign.season,
      hashtags: campaign.hashtags,
      mention: campaign.mention,
      launch_url: cfg.launchUrl,
      meme_gen_url: cfg.memeGenUrl,
      post_ideas: postIdeas,
      // backward compatible
      daily_themes: postIdeas.map((p) => ({
        day: p.suggested_day,
        theme: p.title,
        cta: p.cta,
      })),
      lightreel_calendar: calendar,
      research_run_ids: researchRunIds,
      prompt_used: enrichedPrompt || null,
    };

    const run = await createStrategyRun({
      type: 'campaign_brief',
      input: {
        days,
        focus,
        research_run_ids: researchRunIds,
        has_prompt: Boolean(prompt),
        pipelineId: pipelineIdFrom(input),
      },
      output: brief,
      costUsd: priceForRoute('X402_PRICE_CMO_CAMPAIGN_BRIEF', '0.10'),
      x402PriceUsd: priceForRoute('X402_PRICE_CMO_CAMPAIGN_BRIEF', '0.10'),
      payerHint: extractPayerHint(req),
      pipelineRunId: pipelineIdFrom(input),
    });

    res.json({ success: true, data: { ...brief, run_id: run.id } });
  } catch (err) {
    try {
      await createFailedStrategyRun({
        type: 'campaign_brief',
        input,
        error: err,
        payerHint: extractPayerHint(req),
        x402PriceUsd: priceForRoute('X402_PRICE_CMO_CAMPAIGN_BRIEF', '0.10'),
        pipelineRunId: pipelineIdFrom(input),
      });
    } catch (logErr) {
      console.error('Failed to persist campaign-brief error:', logErr.message);
    }
    res.status(500).json({ success: false, error: err.message, persisted: true });
  }
});

function pipelineIdFrom(input = {}) {
  return input.pipelineId || input.pipeline_id || null;
}

router.post('/brief-to-content', requireAdmin, async (req, res) => {
  try {
    const {
      platform = 'twitter',
      body_text,
      hashtags,
      scheduled_at,
      source_research_id,
      pipeline_run_id,
      metadata,
    } = req.body || {};
    if (!body_text) return res.status(400).json({ error: 'body_text required' });
    const item = await createContentItem({
      platform,
      body_text,
      hashtags,
      scheduled_at: scheduled_at || null,
      status: 'draft',
      deliverable_type: 'social_post',
      source_research_id: source_research_id || null,
      pipeline_run_id: pipeline_run_id || null,
      metadata: metadata || {},
    });
    res.json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** Accept pre-built drafts array and insert content rows (free orchestration). */
router.post('/brief-to-posts', requireAdmin, async (req, res) => {
  try {
    const drafts = Array.isArray(req.body?.drafts) ? req.body.drafts : [];
    if (!drafts.length) return res.status(400).json({ error: 'drafts array required' });
    const pipelineRunId = req.body?.pipeline_run_id || null;
    const sourceResearchId = req.body?.source_research_id || null;
    const items = [];
    for (const d of drafts) {
      if (!d.body_text) continue;
      const item = await createContentItem({
        platform: d.platform || 'twitter',
        body_text: d.body_text,
        hashtags: d.hashtags || null,
        status: 'draft',
        deliverable_type: 'social_post',
        pipeline_run_id: pipelineRunId,
        source_research_id: sourceResearchId,
        metadata: { post_idea: d.post_idea || d.idea || null, ...(d.metadata || {}) },
      });
      items.push(item);
    }
    res.json({ success: true, data: items });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

function extractPostIdeasFromCalendar(calendar, days, campaign, cfg) {
  if (!calendar || calendar.error) return [];
  const slots =
    calendar.days
    || calendar.calendar
    || calendar.items
    || calendar.posts
    || [];
  if (!Array.isArray(slots) || !slots.length) return [];

  return slots.slice(0, days).map((slot, i) => ({
    title: slot.title || slot.theme || slot.topic || `Day ${i + 1} post`,
    angle: slot.angle || slot.description || slot.hook || slot.title || '',
    cta: slot.cta || (i % 2 === 0 ? cfg.memeGenUrl : cfg.launchUrl),
    platform: slot.platform || 'twitter',
    suggested_day: slot.day || slot.suggested_day || i + 1,
  }));
}

export default router;
