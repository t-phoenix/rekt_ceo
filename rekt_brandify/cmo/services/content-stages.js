/**
 * Content sub-pipeline stages — used by day-package (internal) and x402 stage routes.
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  uploadImageToStableStudio,
  submitEditJob,
  pollJobUntilComplete,
  getVisionInteractiveStrategy,
} from '../../scripts/agentcash-client.js';
import {
  pickTemplateFromIdeate,
  seedRecentTemplateIds,
  TEMPLATE_COOLDOWN_COUNT,
} from '../../server/services/memeTemplates.js';
import { runCaptionPipeline } from '../../server/services/captionPipeline.js';
import {
  curatePriceUsd,
  selectTemplatePriceUsd,
  brandifyStagePriceUsd,
  brandifyVisionPriceUsd,
  brandifyGeneratePriceUsd,
  captionStagePriceUsd,
} from './paid-run.js';
import {
  createSession,
  updateSessionVision,
  updateSessionGenerationPrep,
  updateSessionJobId,
  updateSessionGenerated,
  findSession,
  isPgEnabled,
} from '../../server/db/brandifySessions.js';
import { createStrategyRun, createFailedStrategyRun } from '../db/strategyRuns.js';
import {
  createContentItem,
  updateContentItem,
  getContentItem,
  findContentByPipelineDay,
  listRecentMemeTemplateIds,
} from '../db/contentItems.js';
import {
  createBrandifyOutput,
  updateBrandifyOutput,
  listBrandifyOutputsByContentItem,
  setCurrentBrandifyOutput,
  summarizeOutput,
  findBrandifyOutput,
} from '../db/brandifyOutputs.js';
import { fetchCampaignContextForPrompt } from './campaigns-context.js';
import {
  curateProfessionalContent,
  composeCuratedBodyText,
  CTA_TEMPLATES,
} from './content-curator.js';

function mapOutputStatusToStage(status) {
  switch (status) {
    case 'analyzing':
    case 'processing':
      return 'processing';
    case 'awaiting_choices':
      return 'needs_curation';
    case 'done':
      return 'done';
    case 'failed':
      return 'failed';
    case 'incomplete':
    default:
      return 'incomplete';
  }
}

/** Embed output summaries + selected id onto content metadata for UI hydration. */
export async function syncBrandifyOutputsOntoItem(contentItemId, {
  preferStatus = null,
  strategy = null,
  draftSelections = null,
} = {}) {
  if (!contentItemId || !isPgEnabled()) return null;
  const row = await getContentItem(contentItemId);
  if (!row) return null;

  let outputs = await listBrandifyOutputsByContentItem(contentItemId);

  // Backfill: legacy single media_url with no output rows → one "current" done output
  if (!outputs.length && (row.media_url || row.brandify_session_id || row.metadata?.stages?.brandify)) {
    const stage = row.metadata?.stages?.brandify || {};
    const status = stage.status === 'needs_curation'
      ? 'awaiting_choices'
      : stage.status === 'failed'
        ? 'failed'
        : stage.status === 'processing'
          ? 'processing'
          : row.media_url
            ? 'done'
            : 'incomplete';
    await createBrandifyOutput({
      contentItemId,
      pipelineRunId: row.pipeline_run_id || null,
      sessionId: row.brandify_session_id || stage.sessionId || null,
      templateId: row.meme_template_id || row.metadata?.templateId || null,
      status,
      isCurrent: Boolean(row.media_url),
      mediaUrl: row.media_url || stage.media_url || null,
      originalImageUrl: row.metadata?.brandify_original_url || stage.originalImageUrl || null,
      engineUsed: row.metadata?.brandify_engine || stage.engineUsed || null,
      strategy: row.metadata?.brandify_strategy || stage.strategy || null,
      choices: row.metadata?.brandify_choices || stage.userCuratedChoices || [],
      draftSelections: row.metadata?.brandify_draft_selections || {},
      brandifyError: row.metadata?.brandifyError || stage.brandifyError || null,
      label: 'Legacy · imported',
    });
    outputs = await listBrandifyOutputsByContentItem(contentItemId);
  }
  const current = outputs.find((o) => o.isCurrent)
    || outputs.find((o) => o.status === 'done' && o.mediaUrl)
    || null;
  const focus = current
    || outputs.find((o) => ['processing', 'analyzing', 'awaiting_choices'].includes(o.status))
    || outputs[0]
    || null;

  const meta = { ...(row.metadata || {}) };
  meta.brandify_outputs = outputs.map(summarizeOutput);
  meta.selected_output_id = current?.id || null;
  meta.brandify_awaiting_choices = Boolean(
    focus && focus.status === 'awaiting_choices' && !focus.mediaUrl,
  );
  if (draftSelections) {
    meta.brandify_draft_selections = draftSelections;
  }
  if (focus?.strategy || strategy) {
    meta.brandify_strategy = focus?.strategy || strategy;
  }
  if (focus?.originalImageUrl) {
    meta.brandify_original_url = focus.originalImageUrl;
  }
  if (focus?.engineUsed) {
    meta.brandify_engine = focus.engineUsed;
  }
  if (focus?.choices?.length) {
    meta.brandify_choices = focus.choices;
  }
  meta.brandifyError = focus?.brandifyError || focus?.error || null;

  // Keep brandify_templates in sync with known templates from outputs + active id
  const templateMap = new Map();
  for (const t of (Array.isArray(meta.brandify_templates) ? meta.brandify_templates : [])) {
    if (t?.id) templateMap.set(String(t.id), { ...t, id: String(t.id) });
  }
  for (const o of outputs) {
    if (!o.templateId) continue;
    const id = String(o.templateId);
    if (!templateMap.has(id)) {
      templateMap.set(id, { id, addedAt: o.createdAt || new Date().toISOString() });
    }
  }
  if (row.meme_template_id) {
    const id = String(row.meme_template_id);
    if (!templateMap.has(id)) {
      templateMap.set(id, { id, addedAt: new Date().toISOString() });
    }
  }
  if (meta.templateId) {
    const id = String(meta.templateId);
    if (!templateMap.has(id)) {
      templateMap.set(id, { id, addedAt: new Date().toISOString() });
    }
  }
  meta.brandify_templates = [...templateMap.values()];
  if (!meta.brandify_active_template_id) {
    meta.brandify_active_template_id = focus?.templateId
      || row.meme_template_id
      || meta.templateId
      || null;
  }

  const stages = { ...(meta.stages || {}) };
  if (focus) {
    const status = preferStatus || mapOutputStatusToStage(focus.status);
    stages.brandify = {
      ...(stages.brandify || {}),
      status,
      at: focus.updatedAt || new Date().toISOString(),
      sessionId: focus.sessionId,
      outputId: focus.id,
      engineUsed: focus.engineUsed || stages.brandify?.engineUsed,
      media_url: current?.mediaUrl || focus.mediaUrl || stages.brandify?.media_url || null,
      originalImageUrl: focus.originalImageUrl || stages.brandify?.originalImageUrl,
      strategy: focus.strategy || strategy || stages.brandify?.strategy,
      userCuratedChoices: focus.choices?.length
        ? focus.choices
        : stages.brandify?.userCuratedChoices,
      brandifyError: focus.brandifyError || focus.error || null,
      mode: 'interactive',
      outputCount: outputs.length,
      isCurrent: Boolean(focus.isCurrent),
    };
  }
  meta.stages = stages;

  const patch = { metadata: meta };
  if (current?.mediaUrl) patch.media_url = current.mediaUrl;
  if (current?.sessionId) patch.brandify_session_id = current.sessionId;
  if (current?.templateId) patch.meme_template_id = current.templateId;
  return updateContentItem(contentItemId, patch);
}

export async function setBrandifyOutputCurrent({ contentItemId, outputId }) {
  const out = await setCurrentBrandifyOutput(contentItemId, outputId);
  if (!out) throw new Error('Output not found for this content item');
  return syncBrandifyOutputsOntoItem(contentItemId);
}

export async function saveBrandifyDraftSelections({
  contentItemId,
  outputId = null,
  draftSelections,
  customTarget = null,
  feedback = null,
  templates = undefined,
  activeTemplateId = undefined,
}) {
  if (!contentItemId) throw new Error('contentItemId required');
  let targetId = outputId;
  if (!targetId) {
    const outputs = await listBrandifyOutputsByContentItem(contentItemId);
    const focus = outputs.find((o) => o.status === 'awaiting_choices')
      || outputs.find((o) => o.isCurrent)
      || outputs[0];
    targetId = focus?.id || null;
  }
  if (targetId) {
    await updateBrandifyOutput(targetId, {
      draftSelections: draftSelections || {},
      customTarget: customTarget ?? undefined,
      feedback: feedback ?? undefined,
    });
  }

  const row = await getContentItem(contentItemId);
  if (!row) return null;
  const meta = { ...(row.metadata || {}) };
  if (draftSelections) meta.brandify_draft_selections = draftSelections;
  if (templates !== undefined) {
    meta.brandify_templates = Array.isArray(templates) ? templates : [];
  }
  if (activeTemplateId !== undefined) {
    meta.brandify_active_template_id = activeTemplateId || null;
    if (activeTemplateId) {
      meta.templateId = activeTemplateId;
    }
  }
  const patch = { metadata: meta };
  if (activeTemplateId) patch.meme_template_id = activeTemplateId;
  await updateContentItem(contentItemId, patch);
  return syncBrandifyOutputsOntoItem(contentItemId, { draftSelections });
}

function guessCategoryFromText(text) {
  const t = String(text).toLowerCase();
  // Word boundaries only — bare /no/ falsely matched "knowing", "another", "innovation", etc.
  if (/\b(win|love|bullish|bull)\b/.test(t)) return 'Yes - Win - Love';
  if (/\b(sad|oof|lose|bearish|bear)\b/.test(t)) return 'Sad - Oof - Lose';
  if (/\b(wtf|shock|confused|confusion)\b/.test(t)) return 'WTF';
  if (/\b(angry|roast|wicked|hate|rage)\b/.test(t)) return 'Angry - Wicked';
  if (/\b(dumb|genius|iq|brainlet)\b/.test(t)) return 'Dumb - Genius';
  if (/\b(police|officer|fbi|sheriff)\b/.test(t) || /\bstop\s+(it|this|that)\b/.test(t) || /\b(hell\s+)?no\b/.test(t)) {
    return 'No - Stop - Police';
  }
  if (/\b(liar|sauce|fake|rug)\b/.test(t)) return 'Liar - Sauce';
  if (/\b(sweat|cope|panic|run\s*away)\b/.test(t)) return 'Sweat - Run away';
  if (/\b(offend|based|cringe)\b/.test(t)) return 'Offend';
  if (/\b(boring|unimpressed|meh)\b/.test(t)) return 'Humm - Not interesting - Boring';
  if (/\b(funny|lol|lmao|humor)\b/.test(t)) return 'Funny - Not funny';
  if (/\b(horny|thirst|desire)\b/.test(t)) return 'Horny';
  return 'Angry - Wicked';
}

export function parseIdeateFromScript(ideas, idea, prompt) {
  const text =
    ideas?.script
    || ideas?.text
    || ideas?.caption
    || (Array.isArray(ideas?.ideas) ? ideas.ideas[0]?.text : null)
    || idea?.angle
    || idea?.title
    || '';

  const lines = String(text).split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const hook = ideas?.hook || lines[0] || String(idea?.title || '');
  const story_body = ideas?.story_body || lines.slice(1).join('\n') || String(idea?.angle || '');

  const categoryGuess =
    ideas?.template_category
    || ideas?.category
    || guessCategoryFromText(`${idea?.title || ''} ${idea?.angle || ''} ${prompt || ''}`);

  return {
    hook,
    story_body,
    tweet_angle: [hook, story_body].filter(Boolean).join('\n\n') || text,
    visual_concept: ideas?.visual_concept || idea?.angle || idea?.title || 'Rekt CEO meme',
    template_category: categoryGuess,
    // Do not seed keywords with the category name — first token "No"/"Stop" sticky-picks one template.
    template_keywords: Array.isArray(ideas?.template_keywords) && ideas.template_keywords.length
      ? ideas.template_keywords
      : ['rekt', 'ceo'],
    caption_context: [
      hook,
      story_body,
      idea?.title,
      idea?.angle,
      prompt ? String(prompt).slice(0, 400) : '',
    ].filter(Boolean).join('\n'),
    vibe: ideas?.vibe || 'savage CT',
    hashtags: ideas?.hashtags || null,
    cta_label: ideas?.cta_label || null,
    cta_url: ideas?.cta_url || null,
    cta_template_id: ideas?.cta_template_id || null,
    schedule_body: ideas?.schedule_body || null,
    curator_version: ideas?.curator_version || 1,
    raw_ideas: ideas,
  };
}

/** Stage 1 — Professional content curator (hook → story/news → product CTA) */
export async function curateDay({ idea, prompt, research, strategy, featureIds = null, feedback = null }) {
  try {
    const ideate = await curateProfessionalContent({
      idea,
      prompt,
      research,
      strategy,
      featureIds,
      feedback,
    });
    if (!ideate.template_category) {
      ideate.template_category = guessCategoryFromText(
        `${ideate.hook || ''} ${ideate.story_body || ''} ${idea?.title || ''} ${idea?.angle || ''} ${prompt || ''}`,
      );
    }
    return ideate;
  } catch (err) {
    // Last-resort: keep pipeline unblocked
    console.error('curateProfessionalContent failed:', err.message);
    return parseIdeateFromScript(
      { error: err.message, text: idea?.angle || idea?.title, hook: idea?.title },
      idea,
      prompt,
    );
  }
}

let recentTemplatesSeeded = false;

async function ensureRecentTemplateCooldownSeeded() {
  if (recentTemplatesSeeded || !isPgEnabled()) {
    recentTemplatesSeeded = true;
    return;
  }
  try {
    const ids = await listRecentMemeTemplateIds(TEMPLATE_COOLDOWN_COUNT);
    if (ids.length) seedRecentTemplateIds(ids);
  } catch {
    // Non-fatal — in-memory cooldown still works for this process.
  }
  recentTemplatesSeeded = true;
}

/** Stage 2 — Select template from curate output */
export async function selectTemplate({ ideate, templateId = null, excludeIds = null }) {
  if (!templateId) await ensureRecentTemplateCooldownSeeded();
  const template = pickTemplateFromIdeate(ideate, templateId, {
    excludeIds: excludeIds || [],
  });
  if (!template?.exists) {
    throw new Error(`Could not resolve meme template${templateId ? `: ${templateId}` : ''}`);
  }
  return {
    id: template.id,
    name: template.name,
    category: template.category,
    filename: template.filename,
    absolutePath: template.absolutePath,
    exists: true,
  };
}

/**
 * Vision analyze only — same AgentCash path as POST /api/sessions/start.
 * Returns strategy.elements[].ideas for interactive curation.
 */
export async function analyzeTemplateForBrandify(template, customTarget) {
  if (!template?.absolutePath) {
    throw new Error(`Template file path missing for ${template?.id || 'unknown'}`);
  }
  const tmp = path.join(os.tmpdir(), `cmo-tpl-${uuidv4()}${path.extname(template.filename) || '.png'}`);
  fs.copyFileSync(template.absolutePath, tmp);

  try {
    let imageUrl;
    try {
      imageUrl = await uploadImageToStableStudio(tmp);
    } catch (err) {
      const msg = String(err?.message || err);
      if (/settlement failed|402|insufficient|balance/i.test(msg)) {
        throw new Error(
          `AgentCash payment failed while uploading the template (${msg}). Top up the AgentCash wallet in the CMO Workshop panel, then retry Analyze.`,
        );
      }
      throw new Error(`Template upload failed: ${msg}`);
    }

    const strategy = await getVisionInteractiveStrategy(
      imageUrl,
      customTarget || 'Brand this meme for Rekt CEO ($CEO) — subtle logo placements only',
    );

    const sessionId = uuidv4();
    if (isPgEnabled()) {
      await createSession({
        sessionId,
        originalImageUrl: imageUrl,
        userCustomTarget: customTarget || null,
        templateId: template.id,
        category: template.category,
        templateFilename: template.filename,
      });
      await updateSessionVision(sessionId, strategy);
    }

    return {
      sessionId,
      originalImageUrl: imageUrl,
      strategy,
      templateId: template.id,
      templateCategory: template.category,
    };
  } finally {
    try { fs.unlinkSync(tmp); } catch { /* ignore */ }
  }
}

/**
 * Generate branded meme from operator-curated choices — same path as POST /api/generate.
 */
export async function generateBrandifyFromChoices({
  sessionId,
  originalImageUrl = null,
  userCuratedChoices = [],
  feedback = null,
  variationSeed = null,
}) {
  let imageUrl = originalImageUrl;
  if (!imageUrl && sessionId && isPgEnabled()) {
    const session = await findSession(sessionId);
    imageUrl = session?.originalImageUrl || null;
  }
  if (!imageUrl) throw new Error('originalImageUrl or valid sessionId required');

  const choices = (userCuratedChoices || [])
    .filter((c) => c && c.element && c.idea && c.idea !== '__skip__')
    .map((c) => ({
      element: String(c.element),
      idea: String(c.idea).trim(),
      isCustom: Boolean(c.isCustom),
    }))
    .filter((c) => c.idea.length > 0);

  if (!choices.length) {
    return {
      sessionId,
      generatedImageUrl: imageUrl,
      engineUsed: 'original',
      userCuratedChoices: [],
      brandifyError: 'No elements selected — returned original template',
    };
  }

  const prompts = choices.map((c) => `For ${c.element}: ${c.idea}`);
  const seed = variationSeed || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const feedbackNote = feedback
    ? ` OPERATOR FEEDBACK ON PREVIOUS ATTEMPT (must address this and change the result): ${String(feedback).slice(0, 600)}.`
    : '';
  const compiledPrompt = [
    prompts.join(' '),
    'Ensure the rest of the original meme remains 100% untouched. DO NOT alter the original art style.',
    feedbackNote,
    `Variation seed ${seed}: make this generation visually distinct from any prior attempt — different placement, scale, or treatment while staying on-brand.`,
  ].filter(Boolean).join(' ');

  if (isPgEnabled() && sessionId) {
    await updateSessionGenerationPrep(sessionId, choices, compiledPrompt);
  }

  let engineUsed = 'flux-2-pro';
  let result;
  try {
    const submitResult = await submitEditJob(imageUrl, compiledPrompt);
    if (isPgEnabled() && sessionId) await updateSessionJobId(sessionId, submitResult.jobId);
    result = await pollJobUntilComplete(submitResult.pollUrl, submitResult.jobId, () => {});
  } catch (err) {
    const msg = String(err?.message || err);
    if (/sensitive|E005|moderation|flagged/i.test(msg)) {
      try {
        engineUsed = 'gpt-image-2';
        const submitResult = await submitEditJob(imageUrl, compiledPrompt, '/api/generate/gpt-image-2/edit');
        if (isPgEnabled() && sessionId) await updateSessionJobId(sessionId, submitResult.jobId);
        result = await pollJobUntilComplete(submitResult.pollUrl, submitResult.jobId, () => {});
      } catch (fallbackErr) {
        return {
          sessionId,
          generatedImageUrl: imageUrl,
          engineUsed: 'original-fallback',
          userCuratedChoices: choices,
          brandifyError: `Flux sensitive + gpt-image-2 failed: ${fallbackErr.message}`,
        };
      }
    } else {
      return {
        sessionId,
        generatedImageUrl: imageUrl,
        engineUsed: 'original-fallback',
        userCuratedChoices: choices,
        brandifyError: msg,
      };
    }
  }

  if (isPgEnabled() && sessionId) {
    await updateSessionGenerated(sessionId, {
      engineUsed,
      generatedImageUrl: result.imageUrl,
    });
  }

  return {
    sessionId,
    generatedImageUrl: result.imageUrl,
    engineUsed,
    userCuratedChoices: choices,
    feedback: feedback || null,
    variationSeed: seed,
  };
}

/** Auto brandify: vision + idea pick + generate. With feedback, prefer alternate ideas. */
export async function brandifyTemplateFile(template, customTarget, opts = {}) {
  const feedback = opts.feedback || null;
  const target = [
    customTarget || 'Brand this meme for Rekt CEO ($CEO) — subtle logo placements only',
    feedback
      ? `Previous attempt was rejected. Operator feedback: ${String(feedback).slice(0, 500)}. Propose different placements/ideas.`
      : '',
  ].filter(Boolean).join('\n');

  const analyzed = await analyzeTemplateForBrandify(template, target);
  const userCuratedChoices = (analyzed.strategy?.elements || []).map((el, idx) => {
    const ideas = Array.isArray(el.ideas) ? el.ideas : [];
    let idea = ideas[0] || el.idea || 'Rekt CEO branding';
    if (feedback && ideas.length > 1) {
      const pick = (idx + 1 + Math.floor(Math.random() * (ideas.length - 1))) % ideas.length;
      idea = ideas[pick] || ideas[1] || idea;
    }
    return {
      element: el.name || el.element || 'element',
      idea,
    };
  });

  if (!userCuratedChoices.length) {
    return {
      sessionId: analyzed.sessionId,
      generatedImageUrl: analyzed.originalImageUrl,
      engineUsed: 'original',
      strategy: analyzed.strategy,
      userCuratedChoices: [],
      originalImageUrl: analyzed.originalImageUrl,
    };
  }

  const generated = await generateBrandifyFromChoices({
    sessionId: analyzed.sessionId,
    originalImageUrl: analyzed.originalImageUrl,
    userCuratedChoices,
    feedback,
  });

  return {
    ...generated,
    strategy: analyzed.strategy,
    originalImageUrl: analyzed.originalImageUrl,
  };
}

/** Stage 4 — Caption branded image */
export async function captionBrandedImage({
  imageUrl,
  context,
  intensity,
  audience,
  templateId,
  category,
  feedback = null,
}) {
  let finalUrl = imageUrl;
  if (!/^https?:\/\//i.test(imageUrl)) {
    finalUrl = await uploadImageToStableStudio(imageUrl);
  }

  const enrichedContext = [
    context || '',
    feedback
      ? `Previous caption rejected. Feedback: ${String(feedback).slice(0, 400)}. Write clearly different top/bottom text.`
      : '',
  ].filter(Boolean).join('\n');

  const result = await runCaptionPipeline({
    imageUrl: finalUrl,
    context: enrichedContext,
    intensity: intensity || 'savage',
    audience: audience || 'ct',
    contextType: 'topic',
    templateId,
    category,
    isTwitterPost: true,
  });

  const top = Array.isArray(result.options) ? result.options[0] : null;
  return {
    run_id: result.run_id,
    option: top,
    top_text: top?.top_text || '',
    bottom_text: top?.bottom_text || '',
    all_options: result.options || [],
  };
}

/** Stage 5 — Compose body text (admin-free when called via compose route) */
export function composeBodyText({ ideate, caption, idea, strategy, campaign }) {
  return composeCuratedBodyText({ ideate, caption, idea, strategy, campaign });
}

export { CTA_TEMPLATES };

export async function upsertDayContentItem({
  pipelineId,
  suggestedDay,
  idea,
  ideaIndex,
  ideate,
  template,
  brandify,
  caption,
  strategy,
  campaign,
  stages = {},
  seedStageHistory = false,
}) {
  const body_text = composeBodyText({ ideate, caption, idea, strategy, campaign });
  const hashtags = Array.isArray(strategy?.hashtags)
    ? strategy.hashtags
    : (campaign?.hashtags || ['#RektCEO']);

  const at = new Date().toISOString();
  const existing = pipelineId
    ? await findContentByPipelineDay(pipelineId, suggestedDay)
    : null;
  const prevStages = existing?.metadata?.stages || {};

  const enrichedStages = {
    ...prevStages,
    ...stages,
  };

  // Fill rich payloads when full package artifacts are present
  if (ideate) {
    enrichedStages.curate = {
      ...(enrichedStages.curate || {}),
      status: 'done',
      at: enrichedStages.curate?.at || at,
      ideate,
    };
  }
  if (template?.id) {
    enrichedStages.select_template = {
      ...(enrichedStages.select_template || {}),
      status: 'done',
      at: enrichedStages.select_template?.at || at,
      template: { id: template.id, name: template.name, category: template.category },
    };
  }
  if (brandify?.generatedImageUrl || brandify?.engineUsed) {
    enrichedStages.brandify = {
      ...(enrichedStages.brandify || {}),
      status: 'done',
      at: enrichedStages.brandify?.at || at,
      engineUsed: brandify?.engineUsed,
      sessionId: brandify?.sessionId,
      media_url: brandify?.generatedImageUrl,
    };
  }
  if (caption && (caption.top_text != null || caption.bottom_text != null || caption.run_id)) {
    enrichedStages.caption = {
      ...(enrichedStages.caption || {}),
      status: 'done',
      at: enrichedStages.caption?.at || at,
      run_id: caption?.run_id,
      top_text: caption?.top_text || '',
      bottom_text: caption?.bottom_text || '',
    };
  }
  if (stages.compose || body_text) {
    enrichedStages.compose = {
      ...(enrichedStages.compose || {}),
      status: 'done',
      at: enrichedStages.compose?.at || at,
      body_preview: (body_text || '').slice(0, 200),
    };
  }

  let stage_history = existing?.metadata?.stage_history || {};
  if (seedStageHistory) {
    stage_history = { ...stage_history };
    for (const [key, payload] of Object.entries(enrichedStages)) {
      const list = Array.isArray(stage_history[key]) ? [...stage_history[key]] : [];
      list.unshift({ ...payload, source: 'day_package' });
      stage_history[key] = list.slice(0, 20);
    }
  } else if (stages.compose) {
    const list = Array.isArray(stage_history.compose) ? [...stage_history.compose] : [];
    list.unshift({ ...(enrichedStages.compose || {}), source: 'compose' });
    stage_history = { ...stage_history, compose: list.slice(0, 20) };
  }

  const metadata = {
    ...(existing?.metadata || {}),
    suggested_day: suggestedDay,
    ideaIndex,
    post_idea: idea,
    ideate: ideate || existing?.metadata?.ideate,
    templateId: template?.id || existing?.metadata?.templateId || null,
    templateCategory: template?.category || existing?.metadata?.templateCategory || null,
    top_text: caption?.top_text ?? existing?.metadata?.top_text ?? '',
    bottom_text: caption?.bottom_text ?? existing?.metadata?.bottom_text ?? '',
    caption_option: caption?.option || existing?.metadata?.caption_option || null,
    brandify_engine: brandify?.engineUsed || existing?.metadata?.brandify_engine || null,
    package_version: 2,
    stages: enrichedStages,
    stage_history,
    brandifyError: brandify?.brandifyError || caption?.error || existing?.metadata?.brandifyError || null,
  };

  const fields = {
    platform: idea?.platform || existing?.platform || 'twitter',
    body_text,
    hashtags,
    status: 'draft',
    post_type: 'meme',
    deliverable_type: 'social_post',
    media_url: brandify?.generatedImageUrl || existing?.media_url || null,
    meme_template_id: template?.id || existing?.meme_template_id || null,
    brandify_session_id: isPgEnabled()
      ? (brandify?.sessionId || existing?.brandify_session_id || null)
      : null,
    caption_run_id: caption?.run_id || existing?.caption_run_id || null,
    pipeline_run_id: pipelineId,
    metadata,
  };

  let item = existing;
  if (item) {
    item = await updateContentItem(item.id, { ...fields, metadata });
  } else {
    item = await createContentItem(fields);
  }
  return item;
}

/** Patch metadata.stages on an existing day item (or create stub). Also appends stage_history. */
export async function mergeStageOntoItem({
  pipelineId,
  suggestedDay,
  idea,
  ideaIndex,
  stageKey,
  stagePayload,
  extraFields = {},
  strategyRunId = null,
}) {
  let item = pipelineId
    ? await findContentByPipelineDay(pipelineId, suggestedDay)
    : null;

  const prevMeta = item?.metadata || {};
  const stages = { ...(prevMeta.stages || {}), [stageKey]: stagePayload };
  const historyEntry = {
    at: stagePayload?.at || new Date().toISOString(),
    status: stagePayload?.status || 'done',
    strategy_run_id: strategyRunId || stagePayload?.run_id || null,
    ...stagePayload,
  };
  const prevHistory = prevMeta.stage_history || {};
  const stageHist = Array.isArray(prevHistory[stageKey]) ? [...prevHistory[stageKey]] : [];
  stageHist.unshift(historyEntry);
  // Keep last 20 runs per stage
  const stage_history = {
    ...prevHistory,
    [stageKey]: stageHist.slice(0, 20),
  };

  const metadata = {
    ...prevMeta,
    suggested_day: suggestedDay,
    ideaIndex: ideaIndex ?? prevMeta.ideaIndex,
    post_idea: idea || prevMeta.post_idea,
    stages,
    stage_history,
    ...extraFields.metadataPatch,
  };

  const fields = {
    ...extraFields,
    metadata,
    pipeline_run_id: pipelineId || item?.pipeline_run_id,
    platform: idea?.platform || item?.platform || 'twitter',
    status: item?.status || 'draft',
    post_type: item?.post_type || 'meme',
    deliverable_type: item?.deliverable_type || 'social_post',
  };
  delete fields.metadataPatch;

  if (item) {
    return updateContentItem(item.id, fields);
  }
  return createContentItem({
    body_text: fields.body_text || idea?.angle || idea?.title || '',
    hashtags: fields.hashtags || ['#RektCEO'],
    ...fields,
  });
}

export async function runCurateStage({
  idea,
  ideaIndex = 0,
  prompt = null,
  research = null,
  strategy = null,
  pipelineId = null,
  payerHint = null,
  featureIds = null,
  feedback = null,
}) {
  const price = curatePriceUsd();
  const suggestedDay = Number(idea.suggested_day) || ideaIndex + 1;
  try {
    const ideate = await curateDay({ idea, prompt, research, strategy, featureIds, feedback });
    const run = await createStrategyRun({
      type: 'content_stage_curate',
      input: { pipelineId, ideaIndex, suggestedDay, title: idea.title, featureIds },
      output: ideate,
      costUsd: price,
      x402PriceUsd: price,
      payerHint,
      pipelineRunId: pipelineId,
    });
    const item = pipelineId
      ? await mergeStageOntoItem({
        pipelineId,
        suggestedDay,
        idea,
        ideaIndex,
        stageKey: 'curate',
        stagePayload: { status: 'done', at: new Date().toISOString(), ideate, featureIds },
        extraFields: { metadataPatch: { ideate, featureIds: featureIds || [] } },
        strategyRunId: run?.id,
      })
      : null;
    return { ideate, item, price };
  } catch (err) {
    await createFailedStrategyRun({
      type: 'content_stage_curate',
      input: { pipelineId, ideaIndex, featureIds },
      error: err,
      payerHint,
      pipelineRunId: pipelineId,
      x402PriceUsd: price,
    });
    throw err;
  }
}

export async function runSelectTemplateStage({
  ideate,
  templateId = null,
  idea = null,
  ideaIndex = 0,
  pipelineId = null,
  payerHint = null,
}) {
  const price = selectTemplatePriceUsd();
  const suggestedDay = Number(idea?.suggested_day) || ideaIndex + 1;
  try {
    const template = await selectTemplate({ ideate, templateId });
    const publicTpl = { id: template.id, name: template.name, category: template.category };
    const run = await createStrategyRun({
      type: 'content_stage_select_template',
      input: { pipelineId, ideaIndex, templateId: template.id },
      output: publicTpl,
      costUsd: price,
      x402PriceUsd: price,
      payerHint,
      pipelineRunId: pipelineId,
    });
    const item = pipelineId
      ? await mergeStageOntoItem({
        pipelineId,
        suggestedDay,
        idea,
        ideaIndex,
        stageKey: 'select_template',
        stagePayload: { status: 'done', at: new Date().toISOString(), template: publicTpl },
        extraFields: {
          meme_template_id: template.id,
          metadataPatch: { templateId: template.id, templateCategory: template.category },
        },
        strategyRunId: run?.id,
      })
      : null;
    return { template: publicTpl, templateFull: template, item, price };
  } catch (err) {
    await createFailedStrategyRun({
      type: 'content_stage_select_template',
      input: { pipelineId, ideaIndex, templateId },
      error: err,
      payerHint,
      pipelineRunId: pipelineId,
      x402PriceUsd: price,
    });
    throw err;
  }
}

export async function runBrandifyStage({
  template,
  visualConcept = null,
  idea = null,
  ideaIndex = 0,
  pipelineId = null,
  payerHint = null,
  feedback = null,
}) {
  const price = brandifyStagePriceUsd();
  const suggestedDay = Number(idea?.suggested_day) || ideaIndex + 1;

  let stubItem = pipelineId
    ? await findContentByPipelineDay(pipelineId, suggestedDay)
    : null;
  let genOutput = null;
  if (pipelineId) {
    if (!stubItem) {
      stubItem = await mergeStageOntoItem({
        pipelineId,
        suggestedDay,
        idea,
        ideaIndex,
        stageKey: 'brandify',
        stagePayload: {
          status: 'processing',
          at: new Date().toISOString(),
          mode: 'auto',
        },
        extraFields: { meme_template_id: template.id },
      });
    }
    if (stubItem?.id && isPgEnabled()) {
      genOutput = await createBrandifyOutput({
        contentItemId: stubItem.id,
        pipelineRunId: pipelineId,
        templateId: template.id,
        status: 'processing',
        isCurrent: false,
        label: `Auto · ${template.name || template.id}`,
        feedback: feedback || null,
      });
      await syncBrandifyOutputsOntoItem(stubItem.id, { preferStatus: 'processing' });
    }
  }

  try {
    const brandify = await brandifyTemplateFile(
      template,
      `Rekt CEO meme for: ${visualConcept || idea?.title || 'CT'}`,
      { feedback },
    );
    const softFail = brandify.engineUsed === 'original' || brandify.engineUsed === 'original-fallback'
      || Boolean(brandify.brandifyError);
    const run = await createStrategyRun({
      type: 'content_stage_brandify',
      input: { pipelineId, ideaIndex, templateId: template.id, outputId: genOutput?.id },
      output: {
        sessionId: brandify.sessionId,
        generatedImageUrl: brandify.generatedImageUrl,
        engineUsed: brandify.engineUsed,
        outputId: genOutput?.id || null,
      },
      costUsd: price,
      x402PriceUsd: price,
      payerHint,
      pipelineRunId: pipelineId,
    });
    let item = pipelineId
      ? await mergeStageOntoItem({
        pipelineId,
        suggestedDay,
        idea,
        ideaIndex,
        stageKey: 'brandify',
        stagePayload: {
          status: softFail ? 'incomplete' : 'done',
          at: new Date().toISOString(),
          sessionId: brandify.sessionId,
          engineUsed: brandify.engineUsed,
          media_url: brandify.generatedImageUrl,
          mode: 'auto',
          outputId: genOutput?.id || null,
          brandifyError: brandify.brandifyError || null,
        },
        extraFields: {
          media_url: brandify.generatedImageUrl,
          brandify_session_id: isPgEnabled() ? brandify.sessionId : null,
          meme_template_id: template.id,
          metadataPatch: {
            brandify_engine: brandify.engineUsed,
            brandify_strategy: brandify.strategy,
            brandify_choices: brandify.userCuratedChoices,
            brandify_original_url: brandify.originalImageUrl,
            brandify_awaiting_choices: false,
            brandifyError: brandify.brandifyError || null,
          },
        },
        strategyRunId: run?.id,
      })
      : null;

    if (item?.id && isPgEnabled() && genOutput?.id) {
      await updateBrandifyOutput(genOutput.id, {
        sessionId: brandify.sessionId,
        status: softFail ? 'incomplete' : 'done',
        mediaUrl: brandify.generatedImageUrl,
        originalImageUrl: brandify.originalImageUrl,
        engineUsed: brandify.engineUsed,
        strategy: brandify.strategy,
        choices: brandify.userCuratedChoices,
        brandifyError: brandify.brandifyError || null,
        error: softFail ? (brandify.brandifyError || 'Engine returned unbranded/original image') : null,
      });
      if (!softFail) {
        await setCurrentBrandifyOutput(item.id, genOutput.id);
      }
      item = await syncBrandifyOutputsOntoItem(item.id, {
        preferStatus: softFail ? 'incomplete' : 'done',
      });
      genOutput = await findBrandifyOutput(genOutput.id);
    }

    return { brandify: { ...brandify, outputId: genOutput?.id || null }, item, output: genOutput, price };
  } catch (err) {
    if (genOutput?.id) {
      await updateBrandifyOutput(genOutput.id, {
        status: 'failed',
        error: err.message || 'Brandify failed',
      });
      if (stubItem?.id) {
        await syncBrandifyOutputsOntoItem(stubItem.id, { preferStatus: 'failed' });
      }
    }
    await createFailedStrategyRun({
      type: 'content_stage_brandify',
      input: { pipelineId, ideaIndex },
      error: err,
      payerHint,
      pipelineRunId: pipelineId,
      x402PriceUsd: price,
    });
    throw err;
  }
}

/** Interactive step 1: analyze template → strategy options (no generate yet). */
export async function runBrandifyVisionStage({
  template,
  visualConcept = null,
  idea = null,
  ideaIndex = 0,
  pipelineId = null,
  payerHint = null,
  customTarget = null,
  feedback = null,
}) {
  const price = brandifyVisionPriceUsd();
  const suggestedDay = Number(idea?.suggested_day) || ideaIndex + 1;
  const target = [
    customTarget || `Rekt CEO meme for: ${visualConcept || idea?.title || 'CT'}`,
    feedback
      ? `Previous branding was rejected. Feedback: ${String(feedback).slice(0, 500)}. Suggest different element ideas.`
      : '',
  ].filter(Boolean).join('\n');

  // Ensure a day item exists so we can attach an analyzing output before the long vision call.
  let stubItem = pipelineId
    ? await findContentByPipelineDay(pipelineId, suggestedDay)
    : null;
  let analyzingOutput = null;
  if (pipelineId) {
    if (!stubItem) {
      stubItem = await mergeStageOntoItem({
        pipelineId,
        suggestedDay,
        idea,
        ideaIndex,
        stageKey: 'brandify',
        stagePayload: {
          status: 'processing',
          at: new Date().toISOString(),
          mode: 'interactive',
        },
        extraFields: {
          meme_template_id: template.id,
          metadataPatch: {
            brandify_awaiting_choices: false,
          },
        },
      });
    }
    if (stubItem?.id && isPgEnabled()) {
      analyzingOutput = await createBrandifyOutput({
        contentItemId: stubItem.id,
        pipelineRunId: pipelineId,
        templateId: template.id,
        status: 'analyzing',
        isCurrent: false,
        label: `Analysis · ${template.name || template.id}`,
        customTarget: customTarget || null,
        feedback: feedback || null,
      });
      await syncBrandifyOutputsOntoItem(stubItem.id, { preferStatus: 'processing' });
    }
  }

  try {
    const vision = await analyzeTemplateForBrandify(template, target);
    const run = await createStrategyRun({
      type: 'content_stage_brandify_vision',
      input: { pipelineId, ideaIndex, templateId: template.id },
      output: {
        sessionId: vision.sessionId,
        originalImageUrl: vision.originalImageUrl,
        elementCount: vision.strategy?.elements?.length || 0,
        outputId: analyzingOutput?.id || null,
      },
      costUsd: price,
      x402PriceUsd: price,
      payerHint,
      pipelineRunId: pipelineId,
    });

    let item = pipelineId
      ? await mergeStageOntoItem({
        pipelineId,
        suggestedDay,
        idea,
        ideaIndex,
        stageKey: 'brandify',
        stagePayload: {
          status: 'needs_curation',
          at: new Date().toISOString(),
          sessionId: vision.sessionId,
          originalImageUrl: vision.originalImageUrl,
          strategy: vision.strategy,
          mode: 'interactive',
          outputId: analyzingOutput?.id || null,
        },
        extraFields: {
          brandify_session_id: isPgEnabled() ? vision.sessionId : null,
          meme_template_id: template.id,
          metadataPatch: {
            brandify_strategy: vision.strategy,
            brandify_original_url: vision.originalImageUrl,
            brandify_awaiting_choices: true,
            brandify_draft_selections: {},
          },
        },
        strategyRunId: run?.id,
      })
      : null;

    if (item?.id && isPgEnabled()) {
      if (analyzingOutput?.id) {
        await updateBrandifyOutput(analyzingOutput.id, {
          sessionId: vision.sessionId,
          templateId: template.id,
          status: 'awaiting_choices',
          originalImageUrl: vision.originalImageUrl,
          strategy: vision.strategy,
          customTarget: customTarget || null,
          feedback: feedback || null,
          label: `Analysis · ${template.name || template.id}`,
          error: null,
        });
      } else {
        analyzingOutput = await createBrandifyOutput({
          contentItemId: item.id,
          pipelineRunId: pipelineId,
          sessionId: vision.sessionId,
          templateId: template.id,
          status: 'awaiting_choices',
          isCurrent: false,
          originalImageUrl: vision.originalImageUrl,
          strategy: vision.strategy,
          customTarget: customTarget || null,
          feedback: feedback || null,
          label: `Analysis · ${template.name || template.id}`,
        });
      }
      item = await syncBrandifyOutputsOntoItem(item.id, {
        preferStatus: 'needs_curation',
        strategy: vision.strategy,
      });
    }

    return {
      vision: { ...vision, outputId: analyzingOutput?.id || null },
      item,
      output: analyzingOutput,
      price,
    };
  } catch (err) {
    if (analyzingOutput?.id) {
      await updateBrandifyOutput(analyzingOutput.id, {
        status: 'failed',
        error: err.message || 'Brandify analyze failed',
      });
      if (stubItem?.id) {
        await syncBrandifyOutputsOntoItem(stubItem.id, { preferStatus: 'failed' });
      }
    }
    await createFailedStrategyRun({
      type: 'content_stage_brandify_vision',
      input: { pipelineId, ideaIndex },
      error: err,
      payerHint,
      pipelineRunId: pipelineId,
      x402PriceUsd: price,
    });
    throw err;
  }
}

/** Interactive step 2: generate from curated choices. Always appends a new output row. */
export async function runBrandifyGenerateStage({
  sessionId,
  originalImageUrl = null,
  userCuratedChoices = [],
  idea = null,
  ideaIndex = 0,
  pipelineId = null,
  payerHint = null,
  feedback = null,
  outputId = null,
}) {
  const price = brandifyGeneratePriceUsd();
  const suggestedDay = Number(idea?.suggested_day) || ideaIndex + 1;

  let item = pipelineId
    ? await findContentByPipelineDay(pipelineId, suggestedDay)
    : null;

  // Mark stage processing + create a generation output before the long edit job.
  let genOutput = null;
  if (item?.id && isPgEnabled()) {
    const parent = outputId ? await findBrandifyOutput(outputId) : null;
    const strategy = parent?.strategy
      || item.metadata?.brandify_strategy
      || item.metadata?.stages?.brandify?.strategy
      || null;
    genOutput = await createBrandifyOutput({
      contentItemId: item.id,
      pipelineRunId: pipelineId,
      sessionId: sessionId || parent?.sessionId || item.brandify_session_id,
      templateId: item.meme_template_id || parent?.templateId || null,
      status: 'processing',
      isCurrent: false,
      originalImageUrl: originalImageUrl
        || parent?.originalImageUrl
        || item.metadata?.brandify_original_url
        || null,
      strategy,
      choices: userCuratedChoices,
      draftSelections: item.metadata?.brandify_draft_selections || {},
      feedback: feedback || null,
      label: `Generation · ${new Date().toLocaleString()}`,
    });
    await mergeStageOntoItem({
      pipelineId,
      suggestedDay,
      idea,
      ideaIndex,
      stageKey: 'brandify',
      stagePayload: {
        ...(item.metadata?.stages?.brandify || {}),
        status: 'processing',
        at: new Date().toISOString(),
        sessionId: sessionId || item.brandify_session_id,
        outputId: genOutput.id,
        mode: 'interactive',
      },
      extraFields: {
        metadataPatch: {
          brandify_choices: userCuratedChoices,
          brandify_awaiting_choices: false,
          brandify_draft_selections: Object.fromEntries(
            (userCuratedChoices || []).map((c) => [c.element, c.isCustom ? '__custom__' : c.idea]),
          ),
        },
      },
    });
    await syncBrandifyOutputsOntoItem(item.id, { preferStatus: 'processing' });
  }

  try {
    const brandify = await generateBrandifyFromChoices({
      sessionId,
      originalImageUrl,
      userCuratedChoices,
      feedback,
    });
    const softFail = brandify.engineUsed === 'original' || brandify.engineUsed === 'original-fallback'
      || Boolean(brandify.brandifyError);
    const run = await createStrategyRun({
      type: 'content_stage_brandify_generate',
      input: { pipelineId, ideaIndex, sessionId, choiceCount: userCuratedChoices?.length, outputId: genOutput?.id },
      output: {
        sessionId: brandify.sessionId,
        generatedImageUrl: brandify.generatedImageUrl,
        engineUsed: brandify.engineUsed,
        brandifyError: brandify.brandifyError || null,
        outputId: genOutput?.id || null,
      },
      costUsd: price,
      x402PriceUsd: price,
      payerHint,
      pipelineRunId: pipelineId,
    });

    item = pipelineId
      ? await mergeStageOntoItem({
        pipelineId,
        suggestedDay,
        idea,
        ideaIndex,
        stageKey: 'brandify',
        stagePayload: {
          status: softFail ? 'incomplete' : 'done',
          at: new Date().toISOString(),
          sessionId: brandify.sessionId,
          engineUsed: brandify.engineUsed,
          media_url: brandify.generatedImageUrl,
          userCuratedChoices: brandify.userCuratedChoices,
          brandifyError: brandify.brandifyError || null,
          mode: 'interactive',
          outputId: genOutput?.id || null,
        },
        extraFields: {
          media_url: brandify.generatedImageUrl,
          brandify_session_id: isPgEnabled() ? brandify.sessionId : null,
          metadataPatch: {
            brandify_engine: brandify.engineUsed,
            brandify_choices: brandify.userCuratedChoices,
            brandify_awaiting_choices: false,
            brandifyError: brandify.brandifyError || null,
          },
        },
        strategyRunId: run?.id,
      })
      : null;

    if (item?.id && isPgEnabled() && genOutput?.id) {
      await updateBrandifyOutput(genOutput.id, {
        sessionId: brandify.sessionId,
        status: softFail ? 'incomplete' : 'done',
        mediaUrl: brandify.generatedImageUrl,
        engineUsed: brandify.engineUsed,
        choices: brandify.userCuratedChoices,
        brandifyError: brandify.brandifyError || null,
        error: softFail ? (brandify.brandifyError || 'Engine returned unbranded/original image') : null,
        feedback: feedback || null,
        originalImageUrl: brandify.originalImageUrl || originalImageUrl || null,
      });
      if (!softFail) {
        await setCurrentBrandifyOutput(item.id, genOutput.id);
      }
      item = await syncBrandifyOutputsOntoItem(item.id, {
        preferStatus: softFail ? 'incomplete' : 'done',
      });
      genOutput = await findBrandifyOutput(genOutput.id);
    }

    return { brandify: { ...brandify, outputId: genOutput?.id || null }, item, output: genOutput, price };
  } catch (err) {
    if (genOutput?.id) {
      await updateBrandifyOutput(genOutput.id, {
        status: 'failed',
        error: err.message || 'Brandify generate failed',
        choices: userCuratedChoices,
      });
      if (item?.id) {
        await mergeStageOntoItem({
          pipelineId,
          suggestedDay,
          idea,
          ideaIndex,
          stageKey: 'brandify',
          stagePayload: {
            ...(item.metadata?.stages?.brandify || {}),
            status: 'failed',
            at: new Date().toISOString(),
            outputId: genOutput.id,
            brandifyError: err.message || 'Brandify generate failed',
            mode: 'interactive',
          },
          extraFields: {
            metadataPatch: {
              brandifyError: err.message || 'Brandify generate failed',
              brandify_awaiting_choices: false,
            },
          },
        });
        await syncBrandifyOutputsOntoItem(item.id, { preferStatus: 'failed' });
      }
    }
    await createFailedStrategyRun({
      type: 'content_stage_brandify_generate',
      input: { pipelineId, ideaIndex, sessionId, outputId: genOutput?.id },
      error: err,
      payerHint,
      pipelineRunId: pipelineId,
      x402PriceUsd: price,
    });
    throw err;
  }
}

export async function runCaptionStage({
  imageUrl,
  context,
  intensity = 'savage',
  audience = 'ct',
  templateId = null,
  category = null,
  idea = null,
  ideaIndex = 0,
  pipelineId = null,
  payerHint = null,
  feedback = null,
}) {
  const price = captionStagePriceUsd();
  const suggestedDay = Number(idea?.suggested_day) || ideaIndex + 1;
  try {
    const caption = await captionBrandedImage({
      imageUrl,
      context,
      intensity,
      audience,
      templateId,
      category,
      feedback,
    });
    const run = await createStrategyRun({
      type: 'content_stage_caption',
      input: { pipelineId, ideaIndex, templateId },
      output: {
        run_id: caption.run_id,
        top_text: caption.top_text,
        bottom_text: caption.bottom_text,
        all_options: caption.all_options,
        option: caption.option,
      },
      costUsd: price,
      x402PriceUsd: price,
      payerHint,
      pipelineRunId: pipelineId,
    });
    const item = pipelineId
      ? await mergeStageOntoItem({
        pipelineId,
        suggestedDay,
        idea,
        ideaIndex,
        stageKey: 'caption',
        stagePayload: {
          status: 'done',
          at: new Date().toISOString(),
          run_id: caption.run_id,
          top_text: caption.top_text,
          bottom_text: caption.bottom_text,
          all_options: caption.all_options,
          option: caption.option,
        },
        extraFields: {
          caption_run_id: caption.run_id,
          metadataPatch: {
            top_text: caption.top_text,
            bottom_text: caption.bottom_text,
            caption_option: caption.option,
            caption_options: caption.all_options,
          },
        },
        strategyRunId: run?.id || caption.run_id,
      })
      : null;
    return { caption, item, price };
  } catch (err) {
    await createFailedStrategyRun({
      type: 'content_stage_caption',
      input: { pipelineId, ideaIndex },
      error: err,
      payerHint,
      pipelineRunId: pipelineId,
      x402PriceUsd: price,
    });
    throw err;
  }
}

export async function runComposeStage({
  pipelineId,
  idea,
  ideaIndex = 0,
  ideate = null,
  caption = null,
  strategy = null,
  brandify = null,
  template = null,
}) {
  const campaign = await fetchCampaignContextForPrompt();
  const suggestedDay = Number(idea?.suggested_day) || ideaIndex + 1;
  const existing = pipelineId ? await findContentByPipelineDay(pipelineId, suggestedDay) : null;
  const prevStages = existing?.metadata?.stages || {};
  const resolvedIdeate = ideate || existing?.metadata?.ideate || idea?.metadata?.ideate;
  const resolvedCaption = caption || {
    top_text: existing?.metadata?.top_text || '',
    bottom_text: existing?.metadata?.bottom_text || '',
    run_id: existing?.caption_run_id || null,
  };
  const resolvedBrandify = brandify || {
    generatedImageUrl: existing?.media_url,
    sessionId: existing?.brandify_session_id,
    engineUsed: existing?.metadata?.brandify_engine,
  };
  const resolvedTemplate = template || (existing?.meme_template_id
    ? { id: existing.meme_template_id, category: existing.metadata?.templateCategory }
    : null);

  const item = await upsertDayContentItem({
    pipelineId,
    suggestedDay,
    idea,
    ideaIndex,
    ideate: resolvedIdeate,
    template: resolvedTemplate,
    brandify: resolvedBrandify,
    caption: resolvedCaption,
    strategy,
    campaign,
    stages: {
      ...prevStages,
      compose: { status: 'done', at: new Date().toISOString() },
    },
  });
  return { item, body_text: item?.body_text };
}

/**
 * Pay-once chain: run from `fromStage` through compose using existing stage runners.
 * Skips paid upstream work only when caller passes skipDone=true and stage already done —
 * by default always re-runs from the requested stage forward.
 */
export async function runFromStage({
  pipelineId,
  idea,
  ideaIndex = 0,
  fromStage = 'curate',
  prompt = null,
  research = null,
  strategy = null,
  intensity = 'savage',
  audience = 'ct',
  templateId = null,
  ideateOverride = null,
  captionOverride = null,
  payerHint = null,
  featureIds = null,
}) {
  const order = ['curate', 'select', 'brandify', 'caption', 'compose'];
  const startKey = String(fromStage || 'curate').toLowerCase().replace('select_template', 'select');
  const start = Math.max(0, order.indexOf(startKey));
  const stagesRun = [];
  let ideate = ideateOverride;
  let template = null;
  let templateFull = null;
  let brandify = null;
  let caption = captionOverride;
  let item = null;

  for (const stage of order.slice(start)) {
    if (stage === 'curate') {
      const result = await runCurateStage({
        idea,
        ideaIndex,
        prompt,
        research,
        strategy,
        pipelineId,
        payerHint,
        featureIds,
      });
      ideate = result.ideate;
      item = result.item;
      stagesRun.push({ stage, ok: true, price: result.price });
    } else if (stage === 'select') {
      if (!ideate) {
        const existing = await findContentByPipelineDay(pipelineId, Number(idea.suggested_day) || ideaIndex + 1);
        ideate = existing?.metadata?.ideate || existing?.metadata?.stages?.curate?.ideate;
      }
      if (!ideate) throw new Error('Curate output required before template select');
      const result = await runSelectTemplateStage({
        ideate,
        templateId,
        idea,
        ideaIndex,
        pipelineId,
        payerHint,
      });
      template = result.template;
      templateFull = result.templateFull;
      item = result.item;
      stagesRun.push({ stage, ok: true, price: result.price, template });
    } else if (stage === 'brandify') {
      if (!templateFull) {
        const existing = await findContentByPipelineDay(pipelineId, Number(idea.suggested_day) || ideaIndex + 1);
        const tid = templateId || existing?.meme_template_id || existing?.metadata?.templateId;
        templateFull = await selectTemplate({
          ideate: ideate || existing?.metadata?.ideate || { template_category: 'Angry - Wicked' },
          templateId: tid,
        });
      }
      const result = await runBrandifyStage({
        template: templateFull,
        visualConcept: ideate?.visual_concept || idea?.title,
        idea,
        ideaIndex,
        pipelineId,
        payerHint,
      });
      brandify = result.brandify;
      item = result.item;
      stagesRun.push({ stage, ok: true, price: result.price });
    } else if (stage === 'caption') {
      const existing = item || await findContentByPipelineDay(pipelineId, Number(idea.suggested_day) || ideaIndex + 1);
      const imageUrl = brandify?.generatedImageUrl || existing?.media_url;
      if (!imageUrl) throw new Error('Brandify media required before caption');
      const result = await runCaptionStage({
        imageUrl,
        context: ideate?.caption_context || ideate?.tweet_angle || idea?.title,
        intensity,
        audience,
        templateId: template?.id || templateFull?.id || existing?.meme_template_id,
        category: template?.category || templateFull?.category || existing?.metadata?.templateCategory,
        idea,
        ideaIndex,
        pipelineId,
        payerHint,
      });
      caption = {
        ...result.caption,
        ...(captionOverride || {}),
      };
      if (captionOverride?.top_text != null || captionOverride?.bottom_text != null) {
        item = await mergeStageOntoItem({
          pipelineId,
          suggestedDay: Number(idea.suggested_day) || ideaIndex + 1,
          idea,
          ideaIndex,
          stageKey: 'caption',
          stagePayload: {
            ...((existing?.metadata?.stages || {}).caption || {}),
            status: 'done',
            at: new Date().toISOString(),
            top_text: caption.top_text,
            bottom_text: caption.bottom_text,
            run_id: caption.run_id,
            edited: true,
          },
          extraFields: {
            caption_run_id: caption.run_id,
            metadataPatch: {
              top_text: caption.top_text,
              bottom_text: caption.bottom_text,
            },
          },
        });
      } else {
        item = result.item;
      }
      stagesRun.push({ stage, ok: true, price: result.price });
    } else if (stage === 'compose') {
      const result = await runComposeStage({
        pipelineId,
        idea,
        ideaIndex,
        ideate,
        caption,
        strategy,
        brandify,
        template: template || templateFull,
      });
      item = result.item;
      stagesRun.push({ stage, ok: true, price: 0 });
    }
  }

  return { item, stagesRun, fromStage: startKey };
}

export {
  curatePriceUsd,
  selectTemplatePriceUsd,
  brandifyStagePriceUsd,
  brandifyVisionPriceUsd,
  brandifyGeneratePriceUsd,
  captionStagePriceUsd,
};
