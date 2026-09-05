import express from 'express';
import { requireAdmin } from '../middleware/adminAuth.js';
import {
  createPipelineRun,
  getPipelineRun,
  updatePipelineRun,
  listPipelineRuns,
  getPipelineSession,
  syncPipelineContentSnapshot,
} from '../db/pipelineRuns.js';
import { buildStrategyPrompt, buildContentPrompts } from '../services/pipeline.js';
import { updateContentItem } from '../db/contentItems.js';

const router = express.Router();
const STEP_ORDER = ['research', 'strategy', 'content', 'schedule'];

function stepIndex(id) {
  return STEP_ORDER.indexOf(id);
}

function patchStep(steps, stepId, patch) {
  return (steps || []).map((s) => (s.id === stepId ? { ...s, ...patch } : s));
}

router.post('/', requireAdmin, async (req, res) => {
  try {
    const mode = req.body?.mode === 'auto' ? 'auto' : 'manual';
    const research = req.body?.research || {};
    const data = await createPipelineRun({ mode, research, preset: req.body?.preset || 'engagement_ugc' });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** List recent pipelines — must be before /:id */
router.get('/', requireAdmin, async (req, res) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 40;
    const status = req.query.status ? String(req.query.status) : null;
    const data = await listPipelineRuns({ limit, status });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/:id', requireAdmin, async (req, res) => {
  try {
    const enrich = String(req.query.enrich || '1') !== '0';
    const data = enrich
      ? await getPipelineSession(req.params.id)
      : await getPipelineRun(req.params.id);
    if (!data) return res.status(404).json({ success: false, error: 'Pipeline not found' });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.patch('/:id', requireAdmin, async (req, res) => {
  try {
    const existing = await getPipelineRun(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Pipeline not found' });

    let steps = existing.steps;
    const body = req.body || {};

    if (body.researchConfig) {
      steps = patchStep(steps, 'research', {
        config: { ...steps.find((s) => s.id === 'research')?.config, ...body.researchConfig },
      });
      if (body.researchConfig.days != null) {
        steps = patchStep(steps, 'strategy', {
          config: {
            ...steps.find((s) => s.id === 'strategy')?.config,
            days: Number(body.researchConfig.days),
          },
        });
      }
    }
    if (body.days != null) {
      steps = patchStep(steps, 'strategy', {
        config: { ...steps.find((s) => s.id === 'strategy')?.config, days: Number(body.days) },
      });
      steps = patchStep(steps, 'research', {
        config: { ...steps.find((s) => s.id === 'research')?.config, days: Number(body.days) },
      });
    }
    if (body.strategyPrompt != null) {
      steps = patchStep(steps, 'strategy', { promptEditable: body.strategyPrompt });
    }
    if (Array.isArray(body.contentPrompts)) {
      steps = patchStep(steps, 'content', { contentPrompts: body.contentPrompts });
    }
    if (body.post_ideas && existing.outputs?.strategy) {
      const strategy = { ...existing.outputs.strategy, post_ideas: body.post_ideas };
      const contentPrompts = await buildContentPrompts(strategy, existing.outputs.research || {}, {
        featureIds: body.featureIds || strategy.featureIds,
      });
      // Preserve featureIds from client content prompts if provided
      if (Array.isArray(body.contentPrompts)) {
        for (let i = 0; i < contentPrompts.length; i++) {
          if (body.contentPrompts[i]?.featureIds) {
            contentPrompts[i].featureIds = body.contentPrompts[i].featureIds;
          }
        }
      }
      steps = patchStep(steps, 'content', { contentPrompts, status: steps.find((s) => s.id === 'content')?.status || 'idle' });
      const data = await updatePipelineRun(req.params.id, {
        steps,
        outputs: { ...existing.outputs, strategy },
      });
      return res.json({ success: true, data });
    }

    const data = await updatePipelineRun(req.params.id, {
      steps,
      mode: body.mode || existing.mode,
      status: body.status || existing.status,
    });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/:id/steps/research/complete', requireAdmin, async (req, res) => {
  try {
    const existing = await getPipelineRun(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Pipeline not found' });

    const research = req.body?.research || {};
    const runIds = req.body?.runIds || [];
    const hasResearch = Boolean(
      research.competition
      || research.trends
      || research.kol
      || research.intel
      || research.topics
      || research.news
      || research.social
      || research.seo_keywords
      || research.geo_keywords
      || research.brand_mentions
    );
    if (!hasResearch) {
      return res.status(400).json({
        success: false,
        error: 'Research outputs required (competition, trends, kol, topics, news, social, and/or intel)',
      });
    }

    const days = Number(
      req.body?.days
      || existing.steps?.find((s) => s.id === 'strategy')?.config?.days
      || existing.steps?.find((s) => s.id === 'research')?.config?.days
      || process.env.CMO_DEFAULT_DAYS
      || 7,
    );

    const autoPrompt = await buildStrategyPrompt(research, {
      promptEditable: req.body?.strategyPrompt,
      days,
    });

    let steps = patchStep(existing.steps, 'research', {
      status: 'done',
      runIds,
      error: null,
    });
    steps = patchStep(steps, 'strategy', {
      status: 'needs_review',
      config: { ...(existing.steps?.find((s) => s.id === 'strategy')?.config || {}), days },
      autoPrompt,
      promptEditable: autoPrompt,
      error: null,
    });

    const data = await updatePipelineRun(req.params.id, {
      steps,
      outputs: { ...existing.outputs, research },
      current_step: stepIndex('strategy'),
      status: 'running',
      error: null,
      error_step: null,
      metadata: {
        ...(existing.metadata || {}),
        last_research_at: new Date().toISOString(),
        research_run_ids: runIds,
        research_keys: Object.keys(research),
      },
    });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/:id/steps/strategy/complete', requireAdmin, async (req, res) => {
  try {
    const existing = await getPipelineRun(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Pipeline not found' });

    const strategy = req.body?.strategy || {};
    const ideas = Array.isArray(strategy.post_ideas) ? strategy.post_ideas : [];
    if (!ideas.length) {
      return res.status(400).json({ success: false, error: 'strategy.post_ideas must be a non-empty array' });
    }

    const contentPrompts = await buildContentPrompts(strategy, existing.outputs?.research || {}, {
      featureIds: req.body?.featureIds || strategy.featureIds,
    });
    // Allow client to override prompts / feature selection
    if (Array.isArray(req.body?.contentPrompts) && req.body.contentPrompts.length) {
      for (let i = 0; i < contentPrompts.length; i++) {
        const client = req.body.contentPrompts[i];
        if (client?.promptEditable) contentPrompts[i].promptEditable = client.promptEditable;
        if (client?.featureIds) contentPrompts[i].featureIds = client.featureIds;
        if (client?.stagePrompts) {
          contentPrompts[i].stagePrompts = {
            ...(contentPrompts[i].stagePrompts || {}),
            ...client.stagePrompts,
          };
        }
      }
    }

    const strategyStep = (existing.steps || []).find((s) => s.id === 'strategy');
    let steps = patchStep(existing.steps, 'strategy', {
      status: 'done',
      runIds: req.body?.runIds || [],
      promptEditable: req.body?.strategyPrompt || strategyStep?.promptEditable,
      error: null,
    });
    steps = patchStep(steps, 'content', {
      status: 'needs_review',
      contentPrompts,
      contentIds: [],
      error: null,
    });

    const data = await updatePipelineRun(req.params.id, {
      steps,
      outputs: { ...existing.outputs, strategy },
      current_step: stepIndex('content'),
      status: 'running',
      error: null,
      error_step: null,
      metadata: {
        ...(existing.metadata || {}),
        last_strategy_at: new Date().toISOString(),
        post_ideas_count: ideas.length,
        strategy_run_ids: req.body?.runIds || [],
      },
    });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/:id/steps/content/complete', requireAdmin, async (req, res) => {
  try {
    const existing = await getPipelineRun(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Pipeline not found' });

    const contentIds = Array.isArray(req.body?.contentIds) ? req.body.contentIds : [];
    const partial = Boolean(req.body?.partial);
    if (!contentIds.length && !partial) {
      return res.status(400).json({ success: false, error: 'contentIds required' });
    }

    let steps = patchStep(existing.steps, 'content', {
      status: partial ? 'partial' : 'done',
      contentIds,
      runIds: req.body?.runIds || [],
      failedIdeas: req.body?.failedIdeas || [],
      error: partial ? (req.body?.error || 'Some drafts failed') : null,
    });
    steps = patchStep(steps, 'schedule', {
      status: contentIds.length ? 'needs_review' : 'idle',
      error: null,
    });

    await updatePipelineRun(req.params.id, {
      steps,
      outputs: {
        ...existing.outputs,
        contentIds,
        contentItems: req.body?.contentItems || existing.outputs?.contentItems || [],
      },
      current_step: stepIndex('schedule'),
      status: partial ? 'paused' : 'running',
      error: partial ? (req.body?.error || 'Partial content') : null,
      error_step: partial ? 'content' : null,
      metadata: {
        ...(existing.metadata || {}),
        last_content_complete_at: new Date().toISOString(),
      },
    });
    const synced = await syncPipelineContentSnapshot(req.params.id);
    const data = synced || await getPipelineSession(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/:id/steps/schedule', requireAdmin, async (req, res) => {
  try {
    const existing = await getPipelineRun(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Pipeline not found' });

    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (!items.length) {
      return res.status(400).json({ success: false, error: 'items [{ id, scheduled_at }] required' });
    }

    const scheduled = [];
    for (const item of items) {
      if (!item.id || !item.scheduled_at) continue;
      const row = await updateContentItem(item.id, {
        status: 'scheduled',
        scheduled_at: item.scheduled_at,
      });
      if (row) scheduled.push(row);
    }

    const steps = patchStep(existing.steps, 'schedule', {
      status: 'done',
      error: null,
    });

    const data = await updatePipelineRun(req.params.id, {
      steps,
      outputs: { ...existing.outputs, scheduled },
      current_step: stepIndex('schedule'),
      status: 'completed',
      error: null,
      error_step: null,
    });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/:id/fail', requireAdmin, async (req, res) => {
  try {
    const existing = await getPipelineRun(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Pipeline not found' });
    const stepId = req.body?.step || 'research';
    const steps = patchStep(existing.steps, stepId, {
      status: 'failed',
      error: req.body?.error || 'Step failed',
    });
    const data = await updatePipelineRun(req.params.id, {
      steps,
      status: 'failed',
      error: req.body?.error || 'Step failed',
      error_step: stepId,
    });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

function stepsFind(steps, id) {
  return (steps || []).find((s) => s.id === id);
}

export default router;
