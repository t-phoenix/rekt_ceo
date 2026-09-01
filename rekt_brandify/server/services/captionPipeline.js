import { v4 as uuidv4 } from 'uuid';
import {
  CAPTION_COUNT,
  TOP_N,
  HUMOR_TAGS,
  INTENSITY_LEVELS,
  CONTEXT_TYPES,
  AUDIENCE_TYPES,
} from '../constants/caption.js';
import {
  TEMPLATE_DECODE_SYSTEM,
  buildTemplateDecodeUserPrompt,
  CONTEXT_EXTRACT_SYSTEM,
  buildContextExtractUserPrompt,
  CAPTION_STORM_SYSTEM,
  buildCaptionStormUserPrompt,
  JUDGE_SYSTEM,
  buildJudgeUserPrompt,
} from '../prompts/caption-pipeline.js';
import {
  decodeTemplate,
  extractContext,
  generateCaptionStorm,
  judgeCaptions,
} from '../../scripts/caption-client.js';
import { selectTopCaptions } from './captionJudge.js';
import {
  createCaptionRun,
  completeCaptionRun,
  insertCaptionStage,
  insertCaptionCandidates,
} from '../db/captionRuns.js';

function normalizeHumorPalette(raw) {
  if (!raw) return [];
  const items = Array.isArray(raw) ? raw : String(raw).split(',').map((s) => s.trim());
  return items.filter((tag) => HUMOR_TAGS.includes(tag)).slice(0, 4);
}

function detectContextType(context, explicit) {
  if (explicit && explicit !== 'auto' && CONTEXT_TYPES.includes(explicit)) {
    return explicit;
  }
  const trimmed = context.trim();
  if (trimmed.startsWith('@') || /\b(RT|https?:\/\/t\.co)/i.test(trimmed)) return 'tweet';
  if (trimmed.length < 80 && !trimmed.includes('\n')) return 'topic';
  if (trimmed.split('\n').length === 1 && trimmed.length < 200) return 'headline';
  return 'quote';
}

function ensureCandidateIds(candidates) {
  return candidates.map((c, idx) => ({
    ...c,
    id: c.id || `cand_${String(idx + 1).padStart(2, '0')}`,
    top_text: String(c.top_text || '').trim(),
    bottom_text: String(c.bottom_text || '').trim(),
    humor_tag: HUMOR_TAGS.includes(c.humor_tag) ? c.humor_tag : 'observational',
    intensity: INTENSITY_LEVELS.includes(c.intensity) ? c.intensity : 'medium',
    memetic_devices: Array.isArray(c.memetic_devices) ? c.memetic_devices : [],
  }));
}

async function runStage(runId, stageName, fn, input) {
  const started = Date.now();
  const { output, model } = await fn();
  const latencyMs = Date.now() - started;

  await insertCaptionStage({
    runId,
    stage: stageName,
    model,
    latencyMs,
    input,
    output,
  });

  return output;
}

/**
 * Run the full 4-stage caption pipeline.
 */
export async function runCaptionPipeline({
  imageUrl,
  context,
  contextType = 'auto',
  intensity = 'medium',
  humorPalette,
  audience = 'ct',
  templateId,
  category,
  creatorWallet,
  isTwitterPost = false,
  payment,
}) {
  const runId = uuidv4();
  const resolvedContextType = detectContextType(context, contextType);
  const resolvedIntensity = INTENSITY_LEVELS.includes(intensity) ? intensity : 'medium';
  const resolvedAudience = AUDIENCE_TYPES.includes(audience) ? audience : 'ct';
  const resolvedPalette = normalizeHumorPalette(humorPalette);

  const inputSnapshot = {
    context,
    context_type: resolvedContextType,
    intensity: resolvedIntensity,
    humor_palette: resolvedPalette,
    audience: resolvedAudience,
    is_twitter_post: Boolean(isTwitterPost),
    template_id: templateId || null,
    category: category || null,
    template_image_url: imageUrl,
  };

  await createCaptionRun({
    runId,
    creatorWallet,
    templateId,
    category,
    templateImageUrl: imageUrl,
    input: inputSnapshot,
    payment: payment || null,
  });

  const templateDecodeInput = {
    image_url: imageUrl,
    category: category || null,
    template_id: templateId || null,
    system: TEMPLATE_DECODE_SYSTEM,
    user: buildTemplateDecodeUserPrompt({ category, templateId }),
  };

  const contextExtractInput = {
    context,
    context_type: resolvedContextType,
    audience: resolvedAudience,
    system: CONTEXT_EXTRACT_SYSTEM,
    user: buildContextExtractUserPrompt({
      context,
      contextType: resolvedContextType,
      audience: resolvedAudience,
    }),
  };

  try {
    const templateDecode = await runStage(
      runId,
      'template_decode',
      () => decodeTemplate({ imageUrl, category, templateId }),
      templateDecodeInput
    );

    const contextExtract = await runStage(
      runId,
      'context_extract',
      () => extractContext({
        context,
        contextType: resolvedContextType,
        audience: resolvedAudience,
      }),
      contextExtractInput
    );

    const captionStormInput = {
      template_decode: templateDecode,
      context_extract: contextExtract,
      intensity: resolvedIntensity,
      humor_palette: resolvedPalette,
      audience: resolvedAudience,
      count: CAPTION_COUNT,
      system: CAPTION_STORM_SYSTEM,
      user: buildCaptionStormUserPrompt({
        templateDecode,
        contextExtract,
        intensity: resolvedIntensity,
        humorPalette: resolvedPalette,
        audience: resolvedAudience,
        count: CAPTION_COUNT,
      }),
    };

    const stormResult = await runStage(
      runId,
      'caption_storm',
      () => generateCaptionStorm({
        templateDecode,
        contextExtract,
        intensity: resolvedIntensity,
        humorPalette: resolvedPalette,
        audience: resolvedAudience,
        count: CAPTION_COUNT,
      }),
      captionStormInput
    );

    let candidates = ensureCandidateIds(stormResult?.candidates || []);
    if (candidates.length < CAPTION_COUNT) {
      while (candidates.length < CAPTION_COUNT && candidates.length > 0) {
        const clone = { ...candidates[candidates.length % candidates.length] };
        clone.id = `cand_${String(candidates.length + 1).padStart(2, '0')}`;
        candidates.push(clone);
      }
    }
    candidates = candidates.slice(0, CAPTION_COUNT);

    const judgeInput = {
      template_decode: templateDecode,
      context_extract: contextExtract,
      candidates,
      system: JUDGE_SYSTEM,
      user: buildJudgeUserPrompt({ templateDecode, contextExtract, candidates }),
    };

    const judgeResult = await runStage(
      runId,
      'judge',
      () => judgeCaptions({ templateDecode, contextExtract, candidates }),
      judgeInput
    );

    const { top, allRanked } = selectTopCaptions(candidates, judgeResult?.ranked);

    await insertCaptionCandidates(runId, allRanked);

    const responseMetadata = {
      run_id: runId,
      pipeline_persona: [
        'template_whisperer',
        'context_vulture',
        'caption_goblin',
        'judge_judy_of_ct',
      ],
      context_type: resolvedContextType,
      intensity: resolvedIntensity,
      audience: resolvedAudience,
      humor_palette: resolvedPalette,
      template_guess: templateDecode?.template_guess || null,
      all_candidates_count: candidates.length,
      llm: { model: 'gpt-4o', provider: 'netintel' },
    };

    await completeCaptionRun(runId, { responseMetadata });

    return {
      run_id: runId,
      options: top,
      all_candidates_count: candidates.length,
      metadata: responseMetadata,
    };
  } catch (err) {
    await completeCaptionRun(runId, { error: err.message });
    throw err;
  }
}

export { TOP_N, CAPTION_COUNT };
