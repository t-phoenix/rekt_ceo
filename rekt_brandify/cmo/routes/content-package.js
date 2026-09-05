import express from 'express';
import { getPipelineRun, syncPipelineContentSnapshot } from '../db/pipelineRuns.js';
import { extractPayerHint, stageChainPriceUsd } from '../services/paid-run.js';
import {
  runDayPackage,
  dayPackageUnitPrice,
  batchPackagePrice,
} from '../services/day-package.js';
import {
  runCurateStage,
  runSelectTemplateStage,
  runBrandifyStage,
  runBrandifyVisionStage,
  runBrandifyGenerateStage,
  runCaptionStage,
  runComposeStage,
  runFromStage,
  selectTemplate,
  syncBrandifyOutputsOntoItem,
  setBrandifyOutputCurrent,
  saveBrandifyDraftSelections,
} from '../services/content-stages.js';
import { createFailedStrategyRun } from '../db/strategyRuns.js';
import { requireAdmin } from '../middleware/adminAuth.js';
import { findContentByPipelineDay, getContentItem } from '../db/contentItems.js';
import {
  listBrandifyOutputsByContentItem,
  listBrandifyOutputsByPipeline,
  findBrandifyOutput,
  updateBrandifyOutput,
} from '../db/brandifyOutputs.js';

const router = express.Router();

async function softSyncPipeline(pipelineId) {
  if (!pipelineId) return;
  try {
    await syncPipelineContentSnapshot(pipelineId);
  } catch (err) {
    console.error('syncPipelineContentSnapshot failed:', err.message);
  }
}

function resolveIdea(pipeline, ideaIndex) {
  const ideas = pipeline?.outputs?.strategy?.post_ideas || [];
  const idx = Number(ideaIndex);
  if (!Number.isInteger(idx) || idx < 0 || idx >= ideas.length) {
    return { error: `ideaIndex out of range (0..${Math.max(ideas.length - 1, 0)})` };
  }
  return { idea: ideas[idx], ideas };
}

function promptForIndex(pipeline, ideaIndex, bodyPrompt, promptsMap) {
  if (bodyPrompt) return bodyPrompt;
  if (promptsMap && promptsMap[ideaIndex]?.promptEditable) return promptsMap[ideaIndex].promptEditable;
  const contentPrompts = pipeline?.steps?.find((s) => s.id === 'content')?.contentPrompts || [];
  const match = contentPrompts.find((p) => p.ideaIndex === ideaIndex) || contentPrompts[ideaIndex];
  return match?.promptEditable || match?.autoPrompt || null;
}

function featureIdsForIndex(pipeline, ideaIndex, body, promptsMap) {
  if (Array.isArray(body?.featureIds)) return body.featureIds;
  if (promptsMap && Array.isArray(promptsMap[ideaIndex]?.featureIds)) return promptsMap[ideaIndex].featureIds;
  const contentPrompts = pipeline?.steps?.find((s) => s.id === 'content')?.contentPrompts || [];
  const match = contentPrompts.find((p) => p.ideaIndex === ideaIndex) || contentPrompts[ideaIndex];
  return Array.isArray(match?.featureIds) ? match.featureIds : [];
}

function intensityForIndex(pipeline, ideaIndex, body, promptsMap) {
  if (body.intensities?.[ideaIndex]) return body.intensities[ideaIndex];
  if (promptsMap?.[ideaIndex]?.intensity) return promptsMap[ideaIndex].intensity;
  const contentPrompts = pipeline?.steps?.find((s) => s.id === 'content')?.contentPrompts || [];
  const match = contentPrompts.find((p) => p.ideaIndex === ideaIndex) || contentPrompts[ideaIndex];
  return match?.intensity || body.intensity || 'savage';
}

function audienceForIndex(pipeline, ideaIndex, body, promptsMap) {
  if (body.audiences?.[ideaIndex]) return body.audiences[ideaIndex];
  if (promptsMap?.[ideaIndex]?.audience) return promptsMap[ideaIndex].audience;
  const contentPrompts = pipeline?.steps?.find((s) => s.id === 'content')?.contentPrompts || [];
  const match = contentPrompts.find((p) => p.ideaIndex === ideaIndex) || contentPrompts[ideaIndex];
  return match?.audience || body.audience || 'ct';
}

async function loadPipelineIdea(req) {
  const body = req.body || {};
  const pipelineId = body.pipelineId || body.pipeline_id;
  if (!pipelineId) return { error: 'pipelineId required', status: 400 };
  const pipeline = await getPipelineRun(pipelineId);
  if (!pipeline) return { error: 'Pipeline not found', status: 404 };
  const ideaIndex = body.ideaIndex != null ? Number(body.ideaIndex) : 0;
  const resolved = resolveIdea(pipeline, ideaIndex);
  if (resolved.error) return { error: resolved.error, status: 400 };
  return {
    body,
    pipelineId,
    pipeline,
    ideaIndex,
    idea: resolved.idea,
    research: pipeline.outputs?.research || null,
    strategy: pipeline.outputs?.strategy || null,
  };
}

/** POST /api/cmo/content/day-package — x402 fixed unit price */
router.post('/day-package', async (req, res) => {
  const body = req.body || {};
  const payerHint = extractPayerHint(req);
  try {
    const pipelineId = body.pipelineId || body.pipeline_id;
    if (!pipelineId) return res.status(400).json({ success: false, error: 'pipelineId required' });

    const pipeline = await getPipelineRun(pipelineId);
    if (!pipeline) return res.status(404).json({ success: false, error: 'Pipeline not found' });

    const ideaIndex = body.ideaIndex != null ? Number(body.ideaIndex) : 0;
    const resolved = resolveIdea(pipeline, ideaIndex);
    if (resolved.error) return res.status(400).json({ success: false, error: resolved.error });

    const result = await runDayPackage({
      pipelineId,
      idea: resolved.idea,
      ideaIndex,
      prompt: promptForIndex(pipeline, ideaIndex, body.prompt, body.prompts),
      intensity: intensityForIndex(pipeline, ideaIndex, body, body.prompts),
      audience: audienceForIndex(pipeline, ideaIndex, body, body.prompts),
      templateId: body.templateId || body.template_id || null,
      research: pipeline.outputs?.research || null,
      strategy: pipeline.outputs?.strategy || null,
      payerHint,
      featureIds: featureIdsForIndex(pipeline, ideaIndex, body, body.prompts),
    });

    await softSyncPipeline(pipelineId);

    res.json({
      success: true,
      data: {
        ...result,
        unitPrice: dayPackageUnitPrice(),
      },
    });
  } catch (err) {
    try {
      await createFailedStrategyRun({
        type: 'content_day_package',
        input: body,
        error: err,
        payerHint,
        x402PriceUsd: dayPackageUnitPrice(),
        pipelineRunId: body.pipelineId || body.pipeline_id || null,
      });
    } catch { /* ignore */ }
    res.status(500).json({ success: false, error: err.message });
  }
});

/** POST /api/cmo/content/batch-package — x402 dynamic price via X-CMO-Day-Count */
router.post('/batch-package', async (req, res) => {
  const body = req.body || {};
  const payerHint = extractPayerHint(req);
  try {
    const pipelineId = body.pipelineId || body.pipeline_id;
    if (!pipelineId) return res.status(400).json({ success: false, error: 'pipelineId required' });

    const pipeline = await getPipelineRun(pipelineId);
    if (!pipeline) return res.status(404).json({ success: false, error: 'Pipeline not found' });

    const ideas = pipeline.outputs?.strategy?.post_ideas || [];
    if (!ideas.length) {
      return res.status(400).json({ success: false, error: 'No post_ideas — complete strategy first' });
    }

    let indexes = Array.isArray(body.ideaIndexes)
      ? body.ideaIndexes.map(Number)
      : ideas.map((_, i) => i);

    if (body.onlyIdle) {
      const { listContentItems } = await import('../db/contentItems.js');
      const existing = await listContentItems({ limit: 200 });
      const doneDays = new Set(
        existing
          .filter((c) => c.pipeline_run_id === pipelineId && c.media_url)
          .map((c) => Number(c.metadata?.suggested_day)),
      );
      indexes = indexes.filter((i) => {
        const day = Number(ideas[i]?.suggested_day) || i + 1;
        return !doneDays.has(day);
      });
    }

    if (!indexes.length) {
      return res.json({
        success: true,
        data: { results: [], items: [], message: 'No days to process' },
      });
    }

    const headerCount = Number(req.get('x-cmo-day-count') || 0);
    if (headerCount && headerCount !== indexes.length) {
      return res.status(400).json({
        success: false,
        error: `X-CMO-Day-Count (${headerCount}) must match ideaIndexes length (${indexes.length})`,
      });
    }

    const results = [];
    const items = [];
    const failed = [];

    for (const ideaIndex of indexes) {
      const idea = ideas[ideaIndex];
      if (!idea) {
        failed.push({ ideaIndex, error: 'missing idea' });
        continue;
      }
      try {
        const result = await runDayPackage({
          pipelineId,
          idea,
          ideaIndex,
          prompt: promptForIndex(pipeline, ideaIndex, null, body.prompts),
          intensity: intensityForIndex(pipeline, ideaIndex, body, body.prompts),
          audience: audienceForIndex(pipeline, ideaIndex, body, body.prompts),
          templateId: body.templateOverrides?.[ideaIndex] || body.templateId || null,
          research: pipeline.outputs?.research || null,
          strategy: pipeline.outputs?.strategy || null,
          payerHint,
          featureIds: featureIdsForIndex(pipeline, ideaIndex, body, body.prompts),
        });
        results.push({ ideaIndex, ok: true, ...result });
        if (result.item) items.push(result.item);
      } catch (err) {
        failed.push({ ideaIndex, error: err.message });
        results.push({ ideaIndex, ok: false, error: err.message });
      }
    }

    await softSyncPipeline(pipelineId);

    res.json({
      success: true,
      data: {
        results,
        items,
        failed,
        chargedDays: indexes.length,
        unitPrice: dayPackageUnitPrice(),
        totalPrice: batchPackagePrice(indexes.length),
      },
    });
  } catch (err) {
    try {
      await createFailedStrategyRun({
        type: 'content_batch_package',
        input: body,
        error: err,
        payerHint,
        x402PriceUsd: batchPackagePrice(Number(req.get('x-cmo-day-count') || 1)),
        pipelineRunId: body.pipelineId || body.pipeline_id || null,
      });
    } catch { /* ignore */ }
    res.status(500).json({ success: false, error: err.message });
  }
});

/** POST /api/cmo/content/curate — x402 ~3× */
router.post('/curate', async (req, res) => {
  const payerHint = extractPayerHint(req);
  try {
    const loaded = await loadPipelineIdea(req);
    if (loaded.error) return res.status(loaded.status).json({ success: false, error: loaded.error });
    const { pipelineId, pipeline, idea, ideaIndex, research, strategy, body } = loaded;
    const result = await runCurateStage({
      idea,
      ideaIndex,
      prompt: promptForIndex(pipeline, ideaIndex, body.prompt, body.prompts),
      research,
      strategy,
      pipelineId,
      payerHint,
      featureIds: featureIdsForIndex(pipeline, ideaIndex, body, body.prompts),
      feedback: body.feedback || body.rerunFeedback || null,
    });
    await softSyncPipeline(pipelineId);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** POST /api/cmo/content/select-template — x402 ~3× */
router.post('/select-template', async (req, res) => {
  const payerHint = extractPayerHint(req);
  try {
    const loaded = await loadPipelineIdea(req);
    if (loaded.error) return res.status(loaded.status).json({ success: false, error: loaded.error });
    const { pipelineId, idea, ideaIndex, body } = loaded;
    let ideate = body.ideate || null;
    if (!ideate && pipelineId) {
      const day = Number(idea.suggested_day) || ideaIndex + 1;
      const existing = await findContentByPipelineDay(pipelineId, day);
      ideate = existing?.metadata?.ideate || existing?.metadata?.stages?.curate?.ideate || null;
    }
    if (!ideate) {
      return res.status(400).json({ success: false, error: 'ideate required — run curate first or pass ideate' });
    }
    const result = await runSelectTemplateStage({
      ideate,
      templateId: body.templateId || body.template_id || null,
      idea,
      ideaIndex,
      pipelineId,
      payerHint,
    });
    await softSyncPipeline(pipelineId);
    res.json({
      success: true,
      data: { template: result.template, item: result.item, price: result.price },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** POST /api/cmo/content/brandify — x402 auto (vision + first ideas + generate) */
router.post('/brandify', async (req, res) => {
  const payerHint = extractPayerHint(req);
  try {
    const loaded = await loadPipelineIdea(req);
    if (loaded.error) return res.status(loaded.status).json({ success: false, error: loaded.error });
    const { pipelineId, idea, ideaIndex, body } = loaded;
    const day = Number(idea.suggested_day) || ideaIndex + 1;
    const existing = pipelineId ? await findContentByPipelineDay(pipelineId, day) : null;
    const ideate = body.ideate || existing?.metadata?.ideate || null;
    const templateId = body.templateId || body.template_id || existing?.meme_template_id || existing?.metadata?.templateId;

    let template;
    try {
      template = await selectTemplate({
        ideate: ideate || { template_category: 'Angry - Wicked', template_keywords: ['rekt'] },
        templateId,
      });
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }

    const result = await runBrandifyStage({
      template,
      visualConcept: ideate?.visual_concept || idea.title,
      idea,
      ideaIndex,
      pipelineId,
      payerHint,
      feedback: body.feedback || body.rerunFeedback || null,
    });
    await softSyncPipeline(pipelineId);
    res.json({
      success: true,
      data: {
        brandify: {
          sessionId: result.brandify.sessionId,
          generatedImageUrl: result.brandify.generatedImageUrl,
          engineUsed: result.brandify.engineUsed,
          strategy: result.brandify.strategy,
          userCuratedChoices: result.brandify.userCuratedChoices,
          originalImageUrl: result.brandify.originalImageUrl,
          brandifyError: result.brandify.brandifyError || null,
        },
        item: result.item,
        price: result.price,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** POST /api/cmo/content/brandify-vision — analyze only; returns strategy for curation UI */
router.post('/brandify-vision', async (req, res) => {
  const payerHint = extractPayerHint(req);
  try {
    const loaded = await loadPipelineIdea(req);
    if (loaded.error) return res.status(loaded.status).json({ success: false, error: loaded.error });
    const { pipelineId, idea, ideaIndex, body } = loaded;
    const day = Number(idea.suggested_day) || ideaIndex + 1;
    const existing = pipelineId ? await findContentByPipelineDay(pipelineId, day) : null;
    const ideate = body.ideate || existing?.metadata?.ideate || null;
    const templateId = body.templateId || body.template_id || existing?.meme_template_id || existing?.metadata?.templateId;

    let template;
    try {
      template = await selectTemplate({
        ideate: ideate || { template_category: 'Angry - Wicked', template_keywords: ['rekt'] },
        templateId,
      });
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }

    const result = await runBrandifyVisionStage({
      template,
      visualConcept: ideate?.visual_concept || idea.title,
      idea,
      ideaIndex,
      pipelineId,
      payerHint,
      customTarget: body.customTarget || body.custom_target || null,
      feedback: body.feedback || body.rerunFeedback || null,
    });
    await softSyncPipeline(pipelineId);
    res.json({
      success: true,
      data: {
        vision: result.vision,
        item: result.item,
        price: result.price,
      },
    });
  } catch (err) {
    console.error('brandify-vision failed:', err);
    res.status(500).json({ success: false, error: err.message || 'Brandify analyze failed' });
  }
});
router.post('/brandify-generate', async (req, res) => {
  const payerHint = extractPayerHint(req);
  try {
    const loaded = await loadPipelineIdea(req);
    if (loaded.error) return res.status(loaded.status).json({ success: false, error: loaded.error });
    const { pipelineId, idea, ideaIndex, body } = loaded;
    const day = Number(idea.suggested_day) || ideaIndex + 1;
    const existing = pipelineId ? await findContentByPipelineDay(pipelineId, day) : null;
    const sessionId = body.sessionId || body.session_id || existing?.brandify_session_id
      || existing?.metadata?.stages?.brandify?.sessionId;
    const originalImageUrl = body.originalImageUrl || body.original_image_url
      || existing?.metadata?.brandify_original_url
      || existing?.metadata?.stages?.brandify?.originalImageUrl
      || null;
    const userCuratedChoices = body.userCuratedChoices || body.user_curated_choices || [];

    if (!sessionId && !originalImageUrl) {
      return res.status(400).json({
        success: false,
        error: 'sessionId required — run brandify-vision first',
      });
    }
    if (!Array.isArray(userCuratedChoices) || !userCuratedChoices.length) {
      return res.status(400).json({
        success: false,
        error: 'userCuratedChoices required — pick branding options first',
      });
    }

    const result = await runBrandifyGenerateStage({
      sessionId,
      originalImageUrl,
      userCuratedChoices,
      idea,
      ideaIndex,
      pipelineId,
      payerHint,
      feedback: body.feedback || body.rerunFeedback || null,
      outputId: body.outputId || body.output_id || null,
    });
    await softSyncPipeline(pipelineId);
    res.json({
      success: true,
      data: {
        brandify: result.brandify,
        item: result.item,
        output: result.output,
        price: result.price,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** GET /api/cmo/content/brandify-outputs?contentItemId=… | pipelineId=… */
router.get('/brandify-outputs', requireAdmin, async (req, res) => {
  try {
    const contentItemId = req.query.contentItemId || req.query.content_item_id;
    const pipelineId = req.query.pipelineId || req.query.pipeline_id;
    if (contentItemId) {
      const outputs = await listBrandifyOutputsByContentItem(String(contentItemId));
      return res.json({ success: true, data: { outputs } });
    }
    if (pipelineId) {
      const outputs = await listBrandifyOutputsByPipeline(String(pipelineId));
      return res.json({ success: true, data: { outputs } });
    }
    return res.status(400).json({
      success: false,
      error: 'contentItemId or pipelineId required',
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** POST /api/cmo/content/brandify-output/current — pick which generation is live */
router.post('/brandify-output/current', requireAdmin, async (req, res) => {
  try {
    const body = req.body || {};
    const contentItemId = body.contentItemId || body.content_item_id;
    const outputId = body.outputId || body.output_id;
    if (!contentItemId || !outputId) {
      return res.status(400).json({ success: false, error: 'contentItemId and outputId required' });
    }
    const out = await findBrandifyOutput(outputId);
    if (!out || out.contentItemId !== contentItemId) {
      return res.status(404).json({ success: false, error: 'Output not found for content item' });
    }
    if (out.status !== 'done' && out.status !== 'incomplete') {
      return res.status(400).json({
        success: false,
        error: `Cannot set current on status "${out.status}" — need a generated image`,
      });
    }
    if (!out.mediaUrl) {
      return res.status(400).json({ success: false, error: 'Output has no media_url yet' });
    }
    const item = await setBrandifyOutputCurrent({ contentItemId, outputId });
    await softSyncPipeline(item?.pipeline_run_id);
    res.json({ success: true, data: { item, output: out } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** POST /api/cmo/content/brandify-draft — persist element radio/custom picks */
router.post('/brandify-draft', requireAdmin, async (req, res) => {
  try {
    const body = req.body || {};
    let contentItemId = body.contentItemId || body.content_item_id;
    const pipelineId = body.pipelineId || body.pipeline_id;
    const ideaIndex = body.ideaIndex ?? body.idea_index;

    if (!contentItemId && pipelineId != null && ideaIndex != null) {
      const pipeline = await getPipelineRun(pipelineId);
      if (!pipeline) return res.status(404).json({ success: false, error: 'Pipeline not found' });
      const ideas = pipeline?.outputs?.strategy?.post_ideas || [];
      const idea = ideas[Number(ideaIndex)];
      const day = Number(idea?.suggested_day) || Number(ideaIndex) + 1;
      const existing = await findContentByPipelineDay(pipelineId, day);
      contentItemId = existing?.id;
    }
    if (!contentItemId) {
      return res.status(400).json({ success: false, error: 'contentItemId required (or pipelineId + ideaIndex)' });
    }

    const draftSelections = body.draftSelections || body.draft_selections || {
      selections: body.selections || {},
      customs: body.customs || {},
    };
    const item = await saveBrandifyDraftSelections({
      contentItemId,
      outputId: body.outputId || body.output_id || null,
      draftSelections,
      customTarget: body.customTarget ?? body.custom_target ?? null,
      feedback: body.feedback ?? null,
      templates: body.templates ?? body.brandify_templates,
      activeTemplateId: body.activeTemplateId ?? body.active_template_id,
    });
    res.json({ success: true, data: { item } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** PATCH /api/cmo/content/brandify-output/:id — label / notes / soft edits */
router.patch('/brandify-output/:id', requireAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const body = req.body || {};
    const existing = await findBrandifyOutput(id);
    if (!existing) return res.status(404).json({ success: false, error: 'Output not found' });

    const patch = {};
    if (body.label !== undefined) patch.label = body.label;
    if (body.feedback !== undefined) patch.feedback = body.feedback;
    if (body.customTarget !== undefined || body.custom_target !== undefined) {
      patch.customTarget = body.customTarget ?? body.custom_target;
    }
    if (body.draftSelections !== undefined || body.draft_selections !== undefined) {
      patch.draftSelections = body.draftSelections ?? body.draft_selections;
    }
    if (body.metadata !== undefined && typeof body.metadata === 'object') {
      patch.metadata = { ...(existing.metadata || {}), ...body.metadata };
    }

    const output = await updateBrandifyOutput(id, patch);
    let item = null;
    if (existing.contentItemId) {
      item = await syncBrandifyOutputsOntoItem(existing.contentItemId);
    }
    res.json({ success: true, data: { output, item } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** POST /api/cmo/content/brandify-outputs/sync — refresh metadata from table */
router.post('/brandify-outputs/sync', requireAdmin, async (req, res) => {
  try {
    const body = req.body || {};
    const contentItemId = body.contentItemId || body.content_item_id;
    if (!contentItemId) {
      return res.status(400).json({ success: false, error: 'contentItemId required' });
    }
    const row = await getContentItem(contentItemId);
    if (!row) return res.status(404).json({ success: false, error: 'Content item not found' });
    const item = await syncBrandifyOutputsOntoItem(contentItemId);
    const outputs = await listBrandifyOutputsByContentItem(contentItemId);
    res.json({ success: true, data: { item, outputs } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** POST /api/cmo/content/caption — x402 ~3× */
router.post('/caption', async (req, res) => {
  const payerHint = extractPayerHint(req);
  try {
    const loaded = await loadPipelineIdea(req);
    if (loaded.error) return res.status(loaded.status).json({ success: false, error: loaded.error });
    const { pipelineId, pipeline, idea, ideaIndex, body } = loaded;
    const day = Number(idea.suggested_day) || ideaIndex + 1;
    const existing = pipelineId ? await findContentByPipelineDay(pipelineId, day) : null;
    const imageUrl = body.imageUrl || body.image_url || existing?.media_url;
    if (!imageUrl) {
      return res.status(400).json({ success: false, error: 'imageUrl required — run brandify first' });
    }
    const ideate = body.ideate || existing?.metadata?.ideate;
    const result = await runCaptionStage({
      imageUrl,
      context: body.context || ideate?.caption_context || ideate?.tweet_angle || idea.title,
      intensity: intensityForIndex(pipeline, ideaIndex, body, body.prompts),
      audience: audienceForIndex(pipeline, ideaIndex, body, body.prompts),
      templateId: body.templateId || existing?.meme_template_id,
      category: body.category || existing?.metadata?.templateCategory,
      idea,
      ideaIndex,
      pipelineId,
      payerHint,
      feedback: body.feedback || body.rerunFeedback || null,
    });
    await softSyncPipeline(pipelineId);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** POST /api/cmo/content/compose — admin-key free (merge draft body) */
router.post('/compose', requireAdmin, async (req, res) => {
  try {
    const loaded = await loadPipelineIdea(req);
    if (loaded.error) return res.status(loaded.status).json({ success: false, error: loaded.error });
    const { pipelineId, idea, ideaIndex, strategy, body } = loaded;
    const day = Number(idea.suggested_day) || ideaIndex + 1;
    const existing = pipelineId ? await findContentByPipelineDay(pipelineId, day) : null;
    const ideate = body.ideate || existing?.metadata?.ideate;
    const caption = body.caption || {
      top_text: body.top_text ?? existing?.metadata?.top_text,
      bottom_text: body.bottom_text ?? existing?.metadata?.bottom_text,
      run_id: existing?.caption_run_id,
    };
    const brandify = body.brandify || {
      generatedImageUrl: existing?.media_url,
      sessionId: existing?.brandify_session_id,
      engineUsed: existing?.metadata?.brandify_engine,
    };
    const template = body.template || (existing?.meme_template_id
      ? { id: existing.meme_template_id, category: existing.metadata?.templateCategory }
      : null);

    const result = await runComposeStage({
      pipelineId,
      idea,
      ideaIndex,
      ideate,
      caption,
      strategy,
      brandify,
      template,
    });
    await softSyncPipeline(pipelineId);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/cmo/content/run-from-stage
 * Pay once for remaining stages (header X-CMO-From-Stage), run server-side chain, persist all.
 */
router.post('/run-from-stage', async (req, res) => {
  const payerHint = extractPayerHint(req);
  const body = req.body || {};
  try {
    const loaded = await loadPipelineIdea(req);
    if (loaded.error) return res.status(loaded.status).json({ success: false, error: loaded.error });
    const { pipelineId, pipeline, idea, ideaIndex, research, strategy } = loaded;
    const fromStage = String(
      body.fromStage || body.from_stage || req.get('x-cmo-from-stage') || 'curate',
    ).toLowerCase();
    const headerStage = String(req.get('x-cmo-from-stage') || fromStage).toLowerCase();
    if (headerStage.replace('select_template', 'select') !== fromStage.replace('select_template', 'select')) {
      return res.status(400).json({
        success: false,
        error: `X-CMO-From-Stage (${headerStage}) must match body.fromStage (${fromStage})`,
      });
    }

    const result = await runFromStage({
      pipelineId,
      idea,
      ideaIndex,
      fromStage,
      prompt: promptForIndex(pipeline, ideaIndex, body.prompt, body.prompts),
      research,
      strategy,
      intensity: intensityForIndex(pipeline, ideaIndex, body, body.prompts),
      audience: audienceForIndex(pipeline, ideaIndex, body, body.prompts),
      templateId: body.templateId || body.template_id || null,
      ideateOverride: body.ideate || null,
      captionOverride: body.caption || (
        body.top_text != null || body.bottom_text != null
          ? { top_text: body.top_text, bottom_text: body.bottom_text }
          : null
      ),
      payerHint,
      featureIds: featureIdsForIndex(pipeline, ideaIndex, body, body.prompts),
    });

    await softSyncPipeline(pipelineId);
    res.json({
      success: true,
      data: {
        ...result,
        chargedUsd: stageChainPriceUsd(fromStage),
      },
    });
  } catch (err) {
    try {
      await createFailedStrategyRun({
        type: 'content_run_from_stage',
        input: body,
        error: err,
        payerHint,
        x402PriceUsd: stageChainPriceUsd(body.fromStage || body.from_stage || 'curate'),
        pipelineRunId: body.pipelineId || body.pipeline_id || null,
      });
    } catch { /* ignore */ }
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
