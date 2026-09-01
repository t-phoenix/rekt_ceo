import express from 'express';
import multer from 'multer';
import { uploadImageToStableStudio } from '../../scripts/agentcash-client.js';
import { runCaptionPipeline } from '../services/captionPipeline.js';
import { isPgEnabled } from '../db/pg.js';
import {
  insertCaptionFeedback,
  getCaptionRun,
  updateCaptionRunPayment,
} from '../db/captionRuns.js';
import { insertApiRequestLog } from '../db/auditLog.js';
import {
  capturePaymentMeta,
  summarizeMultipartFields,
  summarizeRequestBody,
  summarizeResponseBody,
} from '../utils/audit.js';
import {
  MAX_CONTEXT_LENGTH,
  HUMOR_TAGS,
  INTENSITY_LEVELS,
  CONTEXT_TYPES,
  AUDIENCE_TYPES,
} from '../constants/caption.js';

const router = express.Router();
const upload = multer({ dest: 'server/uploads/' });

function parseHumorPalette(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // fall through
  }
  return String(value)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function validateSuggestInput(body) {
  const context = String(body.context || body.topic || '').trim();
  if (!context) return { error: 'context is required' };
  if (context.length > MAX_CONTEXT_LENGTH) {
    return { error: `context must be at most ${MAX_CONTEXT_LENGTH} characters` };
  }

  const intensity = body.intensity || 'medium';
  if (!INTENSITY_LEVELS.includes(intensity)) {
    return { error: `intensity must be one of: ${INTENSITY_LEVELS.join(', ')}` };
  }

  const contextType = body.context_type || 'auto';
  if (!CONTEXT_TYPES.includes(contextType)) {
    return { error: `context_type must be one of: ${CONTEXT_TYPES.join(', ')}` };
  }

  const audience = body.audience || 'ct';
  if (!AUDIENCE_TYPES.includes(audience)) {
    return { error: `audience must be one of: ${AUDIENCE_TYPES.join(', ')}` };
  }

  const humorPalette = parseHumorPalette(body.humor_palette);
  const invalidTags = humorPalette.filter((t) => !HUMOR_TAGS.includes(t));
  if (invalidTags.length > 0) {
    return { error: `invalid humor_palette tags: ${invalidTags.join(', ')}` };
  }

  return {
    context,
    intensity,
    contextType,
    audience,
    humorPalette,
    templateId: body.template_id || null,
    category: body.category || null,
    creatorWallet: body.creator_wallet || null,
    isTwitterPost: body.is_twitter_post === 'true' || body.is_twitter_post === true,
  };
}

async function recordApiRequest({
  req,
  routeKey,
  statusCode,
  runId,
  creatorWallet,
  payment,
  requestSummary,
  responseSummary,
  startedAt,
}) {
  if (!isPgEnabled()) return;

  try {
    await insertApiRequestLog({
      route: routeKey,
      method: req.method,
      statusCode,
      runId,
      creatorWallet,
      payment,
      requestSummary,
      responseSummary,
      latencyMs: Date.now() - startedAt,
      userAgent: req.get('user-agent'),
    });
  } catch (err) {
    console.error('Caption API audit log write failed:', err.message);
  }
}

// POST /api/captions/suggest
router.post('/suggest', upload.single('template_image'), async (req, res) => {
  const startedAt = Date.now();
  const routeKey = 'POST /api/captions/suggest';
  const payment = capturePaymentMeta(req, routeKey);

  try {
    const file = req.file;
    if (!file) {
      await recordApiRequest({
        req,
        routeKey,
        statusCode: 400,
        payment,
        requestSummary: summarizeMultipartFields(req.body),
        responseSummary: summarizeResponseBody({ error: 'template_image is required' }),
        startedAt,
      });
      return res.status(400).json({ error: 'template_image is required' });
    }

    const validated = validateSuggestInput(req.body || {});
    if (validated.error) {
      await recordApiRequest({
        req,
        routeKey,
        statusCode: 400,
        payment,
        requestSummary: summarizeMultipartFields(req.body),
        responseSummary: summarizeResponseBody({ error: validated.error }),
        startedAt,
      });
      return res.status(400).json({ error: validated.error });
    }

    const fileMeta = {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    };

    const imageUrl = await uploadImageToStableStudio(file.path);

    const contextType = validated.isTwitterPost && validated.contextType === 'auto'
      ? 'tweet'
      : validated.contextType;

    const result = await runCaptionPipeline({
      imageUrl,
      context: validated.context,
      contextType,
      intensity: validated.intensity,
      humorPalette: validated.humorPalette,
      audience: validated.audience,
      templateId: validated.templateId,
      category: validated.category,
      creatorWallet: validated.creatorWallet,
      isTwitterPost: validated.isTwitterPost,
      payment,
    });

    await recordApiRequest({
      req,
      routeKey,
      statusCode: 200,
      runId: result.run_id,
      creatorWallet: validated.creatorWallet,
      payment,
      requestSummary: {
        ...summarizeMultipartFields(req.body),
        file: fileMeta,
        template_image_url: imageUrl,
      },
      responseSummary: summarizeResponseBody({
        run_id: result.run_id,
        option_count: result.options?.length || 0,
        all_candidates_count: result.all_candidates_count,
      }),
      startedAt,
    });

    res.json(result);
  } catch (err) {
    console.error('Caption suggest error:', err);
    await recordApiRequest({
      req,
      routeKey,
      statusCode: 500,
      payment,
      requestSummary: summarizeMultipartFields(req.body),
      responseSummary: summarizeResponseBody({ error: err.message }),
      startedAt,
    });
    res.status(500).json({ error: err.message });
  }
});

// POST /api/captions/rate
router.post('/rate', async (req, res) => {
  const startedAt = Date.now();
  const routeKey = 'POST /api/captions/rate';
  const payment = capturePaymentMeta(req, routeKey);

  try {
    const {
      run_id: runId,
      selected_candidate_id: selectedCandidateId,
      rating,
      feedback_text: feedbackText,
      creator_wallet: creatorWallet,
    } = req.body || {};

    if (!runId) {
      await recordApiRequest({
        req,
        routeKey,
        statusCode: 400,
        runId,
        payment,
        requestSummary: summarizeRequestBody(req.body),
        responseSummary: summarizeResponseBody({ error: 'run_id is required' }),
        startedAt,
      });
      return res.status(400).json({ error: 'run_id is required' });
    }
    if (!rating || !['Like', 'Dislike', 'Neutral'].includes(rating)) {
      await recordApiRequest({
        req,
        routeKey,
        statusCode: 400,
        runId,
        payment,
        requestSummary: summarizeRequestBody(req.body),
        responseSummary: summarizeResponseBody({ error: 'invalid rating' }),
        startedAt,
      });
      return res.status(400).json({ error: "rating must be 'Like', 'Dislike', or 'Neutral'" });
    }

    const run = isPgEnabled() ? await getCaptionRun(runId) : { id: runId };
    if (!run) {
      await recordApiRequest({
        req,
        routeKey,
        statusCode: 404,
        runId,
        payment,
        requestSummary: summarizeRequestBody(req.body),
        responseSummary: summarizeResponseBody({ error: 'Caption run not found' }),
        startedAt,
      });
      return res.status(404).json({ error: 'Caption run not found' });
    }

    if (isPgEnabled()) {
      await insertCaptionFeedback({
        runId,
        selectedCandidateId,
        rating,
        feedbackText,
        creatorWallet,
      });
      await updateCaptionRunPayment(runId, payment);
    }

    const body = { success: true, run_id: runId, rating };
    await recordApiRequest({
      req,
      routeKey,
      statusCode: 200,
      runId,
      creatorWallet,
      payment,
      requestSummary: summarizeRequestBody(req.body),
      responseSummary: summarizeResponseBody(body),
      startedAt,
    });

    res.json(body);
  } catch (err) {
    console.error('Caption rate error:', err);
    await recordApiRequest({
      req,
      routeKey,
      statusCode: 500,
      payment,
      requestSummary: summarizeRequestBody(req.body),
      responseSummary: summarizeResponseBody({ error: err.message }),
      startedAt,
    });
    res.status(500).json({ error: err.message });
  }
});

export default router;
