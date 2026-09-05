import express from 'express';
import { runCompetitionResearch } from '../services/competition.js';
import { discoverKols, getKolOpportunities, draftContentFromTopic } from '../services/kol.js';
import { lightreelTrends, lightreelBrandMentions } from '../services/agentcash-client.js';
import {
  runTopicsResearch,
  runSocialPulse,
  runNewsEvents,
  runIntelPack,
  persistIntelRun,
} from '../services/research-intel.js';
import { listStrategyRuns, createFailedStrategyRun, createStrategyRun, getStrategyRunById } from '../db/strategyRuns.js';
import { requireAdmin } from '../middleware/adminAuth.js';
import { extractPayerHint, priceForRoute } from '../services/paid-run.js';

const router = express.Router();

async function failRun(req, type, input, err, priceEnv, priceDefault) {
  try {
    await createFailedStrategyRun({
      type,
      input,
      error: err,
      payerHint: extractPayerHint(req),
      x402PriceUsd: priceForRoute(priceEnv, priceDefault),
      pipelineRunId: input?.pipelineId || input?.pipeline_id || null,
    });
  } catch (logErr) {
    console.error('Failed to persist CMO run error:', logErr.message);
  }
}

function pipelineIdFrom(input = {}) {
  return input.pipelineId || input.pipeline_id || null;
}

router.post('/competition', async (req, res) => {
  const input = req.body || {};
  try {
    const { handles = [], include_reddit = true, depth = 'basic', force_refresh = false } = input;
    if (!handles.length) {
      return res.status(400).json({ error: 'handles array is required' });
    }
    const data = await runCompetitionResearch({
      handles,
      includeReddit: include_reddit,
      depth,
      forceRefresh: force_refresh,
      pipelineRunId: pipelineIdFrom(input),
    });
    res.json({ success: true, data });
  } catch (err) {
    await failRun(req, 'competition_playbook', input, err, 'X402_PRICE_CMO_COMPETITION', '0.25');
    res.status(500).json({ success: false, error: err.message, persisted: true });
  }
});

router.post('/kol', async (req, res) => {
  const input = req.body || {};
  try {
    const { handles = [], niche } = input;
    if (!handles.length) {
      return res.status(400).json({ error: 'handles array is required' });
    }
    const data = await discoverKols({
      handles,
      niche,
      pipelineRunId: pipelineIdFrom(input),
    });
    res.json({ success: true, data });
  } catch (err) {
    await failRun(req, 'kol_plan', input, err, 'X402_PRICE_CMO_KOL', '0.15');
    res.status(500).json({ success: false, error: err.message, persisted: true });
  }
});

router.post('/trends', async (req, res) => {
  const input = req.body || {};
  try {
    const data = await lightreelTrends({
      topic: input.topic || 'crypto memecoin CT',
      niche: input.niche || 'web3',
    });
    await createStrategyRun({
      type: 'trends',
      input,
      output: data,
      costUsd: priceForRoute('X402_PRICE_CMO_TRENDS', '0.06'),
      x402PriceUsd: priceForRoute('X402_PRICE_CMO_TRENDS', '0.06'),
      payerHint: extractPayerHint(req),
      pipelineRunId: pipelineIdFrom(input),
    });
    res.json({ success: true, data });
  } catch (err) {
    await failRun(req, 'trends', input, err, 'X402_PRICE_CMO_TRENDS', '0.06');
    res.status(500).json({ success: false, error: err.message, persisted: true });
  }
});

router.post('/brand-mentions', async (req, res) => {
  const input = req.body || {};
  try {
    const data = await lightreelBrandMentions({
      brand: input.brand || 'Rekt CEO',
      ...input,
    });
    await createStrategyRun({
      type: 'brand_mentions',
      input,
      output: data,
      costUsd: priceForRoute('X402_PRICE_CMO_BRAND_MENTIONS', '0.08'),
      x402PriceUsd: priceForRoute('X402_PRICE_CMO_BRAND_MENTIONS', '0.08'),
      payerHint: extractPayerHint(req),
      pipelineRunId: pipelineIdFrom(input),
    });
    res.json({ success: true, data });
  } catch (err) {
    await failRun(req, 'brand_mentions', input, err, 'X402_PRICE_CMO_BRAND_MENTIONS', '0.08');
    res.status(500).json({ success: false, error: err.message, persisted: true });
  }
});

router.get('/runs', requireAdmin, async (req, res) => {
  try {
    const type = req.query.type ? String(req.query.type) : undefined;
    const status = req.query.status ? String(req.query.status) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const pipelineRunId = (req.query.pipeline_run_id || req.query.pipelineId)
      ? String(req.query.pipeline_run_id || req.query.pipelineId)
      : null;
    const data = await listStrategyRuns({ type, status, limit, pipelineRunId });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/runs/:id', requireAdmin, async (req, res) => {
  try {
    const data = await getStrategyRunById(req.params.id);
    if (!data) return res.status(404).json({ success: false, error: 'Run not found' });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/content-draft', async (req, res) => {
  const input = req.body || {};
  try {
    const {
      topic,
      platform = 'twitter',
      prompt = null,
      strategy_context = null,
      research_context = null,
    } = input;
    if (!topic && !prompt) return res.status(400).json({ error: 'topic or prompt is required' });
    const data = await draftContentFromTopic({
      topic: topic || 'Rekt CEO',
      platform,
      prompt,
      strategyContext: strategy_context,
      researchContext: research_context,
    });
    const run = await createStrategyRun({
      type: 'content_draft',
      input,
      output: data,
      costUsd: priceForRoute('X402_PRICE_CMO_CONTENT_DRAFT', '0.05'),
      x402PriceUsd: priceForRoute('X402_PRICE_CMO_CONTENT_DRAFT', '0.05'),
      payerHint: extractPayerHint(req),
      pipelineRunId: pipelineIdFrom(input),
    });
    res.json({ success: true, data: { ...data, run_id: run.id } });
  } catch (err) {
    await failRun(req, 'content_draft', input, err, 'X402_PRICE_CMO_CONTENT_DRAFT', '0.05');
    res.status(500).json({ success: false, error: err.message, persisted: true });
  }
});

router.post('/kol-opportunities', async (req, res) => {
  const input = req.body || {};
  try {
    const data = await getKolOpportunities({ limit: input.limit || 10 });
    await createStrategyRun({
      type: 'kol_opportunities',
      input,
      output: data,
      costUsd: priceForRoute('X402_PRICE_CMO_KOL_OPPS', '0.12'),
      x402PriceUsd: priceForRoute('X402_PRICE_CMO_KOL_OPPS', '0.12'),
      payerHint: extractPayerHint(req),
      pipelineRunId: pipelineIdFrom(input),
    });
    res.json({ success: true, data });
  } catch (err) {
    await failRun(req, 'kol_opportunities', input, err, 'X402_PRICE_CMO_KOL_OPPS', '0.12');
    res.status(500).json({ success: false, error: err.message, persisted: true });
  }
});

router.post('/topics', async (req, res) => {
  const input = req.body || {};
  try {
    const data = await runTopicsResearch({
      topic: input.topic || 'Rekt CEO crypto memecoin CT',
      niche: input.niche || 'web3',
      brand: input.brand || 'Rekt CEO',
    });
    const run = await persistIntelRun({
      type: 'research_topics',
      input,
      output: data,
      payerHint: extractPayerHint(req),
      priceEnv: 'X402_PRICE_CMO_TOPICS',
      priceDefault: '0.21',
      agentcashCostUsd: data.agentcash_cost_usd,
      pipelineRunId: pipelineIdFrom(input),
    });
    res.json({ success: true, data: { ...data, run_id: run.id } });
  } catch (err) {
    await failRun(req, 'research_topics', input, err, 'X402_PRICE_CMO_TOPICS', '0.21');
    res.status(500).json({ success: false, error: err.message, persisted: true });
  }
});

router.post('/social-pulse', async (req, res) => {
  const input = req.body || {};
  try {
    const data = await runSocialPulse({
      handles: input.handles || [],
      redditQuery: input.redditQuery || input.reddit_query || input.topic,
      linkedinUrls: input.linkedinUrls || input.linkedin_urls || [],
      linkedinCompanyUrls: input.linkedinCompanyUrls || input.linkedin_company_urls || [],
      topic: input.topic || 'crypto memecoin',
    });
    const run = await persistIntelRun({
      type: 'research_social_pulse',
      input,
      output: data,
      payerHint: extractPayerHint(req),
      priceEnv: 'X402_PRICE_CMO_SOCIAL_PULSE',
      priceDefault: '0.36',
      agentcashCostUsd: data.agentcash_cost_usd,
      pipelineRunId: pipelineIdFrom(input),
    });
    res.json({ success: true, data: { ...data, run_id: run.id } });
  } catch (err) {
    await failRun(req, 'research_social_pulse', input, err, 'X402_PRICE_CMO_SOCIAL_PULSE', '0.36');
    res.status(500).json({ success: false, error: err.message, persisted: true });
  }
});

router.post('/news-events', async (req, res) => {
  const input = req.body || {};
  try {
    const data = await runNewsEvents({
      topic: input.topic || 'crypto memecoin',
      topics: input.topics || [],
      query: input.query || null,
    });
    const run = await persistIntelRun({
      type: 'research_news_events',
      input,
      output: data,
      payerHint: extractPayerHint(req),
      priceEnv: 'X402_PRICE_CMO_NEWS_EVENTS',
      priceDefault: '0.18',
      agentcashCostUsd: data.agentcash_cost_usd,
      pipelineRunId: pipelineIdFrom(input),
    });
    res.json({ success: true, data: { ...data, run_id: run.id } });
  } catch (err) {
    await failRun(req, 'research_news_events', input, err, 'X402_PRICE_CMO_NEWS_EVENTS', '0.18');
    res.status(500).json({ success: false, error: err.message, persisted: true });
  }
});

router.post('/intel-pack', async (req, res) => {
  const input = req.body || {};
  try {
    const data = await runIntelPack({
      topic: input.topic || 'Rekt CEO crypto memecoin CT',
      niche: input.niche || 'web3',
      brand: input.brand || 'Rekt CEO',
      handles: input.handles || [],
      redditQuery: input.redditQuery || input.reddit_query,
      linkedinUrls: input.linkedinUrls || input.linkedin_urls || [],
      linkedinCompanyUrls: input.linkedinCompanyUrls || input.linkedin_company_urls || [],
    });
    const run = await persistIntelRun({
      type: 'research_intel_pack',
      input,
      output: data,
      payerHint: extractPayerHint(req),
      priceEnv: 'X402_PRICE_CMO_INTEL_PACK',
      priceDefault: '0.75',
      agentcashCostUsd: data.agentcash_cost_usd,
      pipelineRunId: pipelineIdFrom(input),
    });
    res.json({ success: true, data: { ...data, run_id: run.id } });
  } catch (err) {
    await failRun(req, 'research_intel_pack', input, err, 'X402_PRICE_CMO_INTEL_PACK', '0.75');
    res.status(500).json({ success: false, error: err.message, persisted: true });
  }
});

export default router;
