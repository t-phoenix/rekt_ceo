/**
 * Full day package: curate → select template → brandify → caption → upsert.
 * Stages live in content-stages.js (also exposed as individual x402 routes).
 */

import {
  curateDay,
  selectTemplate,
  brandifyTemplateFile,
  captionBrandedImage,
  upsertDayContentItem,
} from './content-stages.js';
import { createStrategyRun, createFailedStrategyRun } from '../db/strategyRuns.js';
import { fetchCampaignContextForPrompt } from './campaigns-context.js';
import { dayPackagePriceUsd } from './paid-run.js';

/**
 * Full day package: ideate → pick template → brandify → caption → upsert content item.
 */
export async function runDayPackage({
  pipelineId,
  idea,
  ideaIndex = 0,
  prompt = null,
  intensity = 'savage',
  audience = 'ct',
  templateId = null,
  research = null,
  strategy = null,
  payerHint = null,
  featureIds = null,
}) {
  const campaign = await fetchCampaignContextForPrompt();
  const suggestedDay = Number(idea.suggested_day) || ideaIndex + 1;
  const unitPrice = dayPackagePriceUsd();

  let ideate;
  try {
    ideate = await curateDay({ idea, prompt, research, strategy, featureIds });
    await createStrategyRun({
      type: 'content_day_ideate',
      input: { pipelineId, ideaIndex, suggestedDay, title: idea.title, featureIds },
      output: ideate,
      costUsd: unitPrice,
      x402PriceUsd: unitPrice,
      payerHint,
      pipelineRunId: pipelineId,
    });
  } catch (err) {
    await createFailedStrategyRun({
      type: 'content_day_ideate',
      input: { pipelineId, ideaIndex, featureIds },
      error: err,
      payerHint,
      x402PriceUsd: unitPrice,
      pipelineRunId: pipelineId,
    });
    throw err;
  }

  const template = await selectTemplate({ ideate, templateId });

  const brandify = await brandifyTemplateFile(
    template,
    `Rekt CEO meme for: ${ideate.visual_concept || idea.title}`,
  );

  let caption = { top_text: '', bottom_text: '', run_id: null, option: null };
  try {
    caption = await captionBrandedImage({
      imageUrl: brandify.generatedImageUrl,
      context: ideate.caption_context || ideate.tweet_angle || idea.title,
      intensity,
      audience,
      templateId: template.id,
      category: template.category,
    });
  } catch (err) {
    caption = { top_text: '', bottom_text: '', run_id: null, error: err.message };
  }

  const item = await upsertDayContentItem({
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
    seedStageHistory: true,
    stages: {
      curate: { status: 'done' },
      select_template: { status: 'done', templateId: template.id },
      brandify: { status: 'done', engineUsed: brandify.engineUsed },
      caption: { status: 'done', run_id: caption.run_id },
      compose: { status: 'done' },
    },
  });

  await createStrategyRun({
    type: 'content_day_package',
    input: { pipelineId, ideaIndex, suggestedDay, templateId: template.id },
    output: {
      content_id: item?.id,
      media_url: brandify.generatedImageUrl,
      template_id: template.id,
      caption_run_id: caption.run_id,
    },
    costUsd: unitPrice,
    x402PriceUsd: unitPrice,
    payerHint,
    pipelineRunId: pipelineId,
  });

  try {
    const { syncPipelineContentSnapshot } = await import('../db/pipelineRuns.js');
    await syncPipelineContentSnapshot(pipelineId);
  } catch (err) {
    console.error('syncPipelineContentSnapshot failed:', err.message);
  }

  return {
    item,
    ideate,
    template: { id: template.id, name: template.name, category: template.category },
    brandify: {
      sessionId: brandify.sessionId,
      generatedImageUrl: brandify.generatedImageUrl,
      engineUsed: brandify.engineUsed,
    },
    caption,
  };
}

export function dayPackageUnitPrice() {
  return dayPackagePriceUsd();
}

export function batchPackagePrice(dayCount) {
  const n = Math.max(1, Number(dayCount) || 1);
  return Number((n * dayPackageUnitPrice()).toFixed(6));
}
