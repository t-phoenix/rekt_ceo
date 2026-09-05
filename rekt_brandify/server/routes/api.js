import express from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import {
  uploadImageToStableStudio,
  submitEditJob,
  pollJobUntilComplete,
  getVisionInteractiveStrategy,
} from '../../scripts/agentcash-client.js';
import {
  createSession,
  findSession,
  updateSessionVision,
  updateSessionGenerationPrep,
  updateSessionJobId,
  updateSessionGenerated,
  updateSessionError,
  rateSession,
  listPublicVariations,
  isPgEnabled,
} from '../db/brandifySessions.js';
import { insertSessionStage, appendSessionPayment } from '../db/sessionStages.js';
import { insertApiRequestLog } from '../db/auditLog.js';
import {
  capturePaymentMeta,
  summarizeMultipartFields,
  summarizeRequestBody,
  summarizeResponseBody,
} from '../utils/audit.js';
import captionsRouter from './captions.js';
import templatesRouter from './templates.js';
import { cmoRouter } from '../../cmo/index.js';

const router = express.Router();
const upload = multer({ dest: 'server/uploads/' });

router.use('/captions', captionsRouter);
router.use('/cmo', cmoRouter);

function dbUnavailable(res) {
  return res.status(503).json({
    error: 'Database unavailable — configure DATABASE_URL (Supabase Postgres)',
  });
}

async function recordApiRequest({
  req,
  routeKey,
  statusCode,
  sessionId,
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
      sessionId,
      runId,
      creatorWallet,
      payment,
      requestSummary,
      responseSummary,
      latencyMs: Date.now() - startedAt,
      userAgent: req.get('user-agent'),
    });
  } catch (err) {
    console.error('API audit log write failed:', err.message);
  }
}

async function runTimedStage(sessionId, stage, attempt, fn, input) {
  const started = Date.now();
  try {
    const output = await fn();
    await insertSessionStage({
      sessionId,
      stage,
      attempt,
      latencyMs: Date.now() - started,
      input,
      output,
    });
    return output;
  } catch (err) {
    await insertSessionStage({
      sessionId,
      stage,
      attempt,
      latencyMs: Date.now() - started,
      input,
      error: err.message,
    });
    throw err;
  }
}

// Public community variations (free) — register before paid /templates router
router.get('/templates/:templateId/variations', async (req, res) => {
  const startedAt = Date.now();
  const routeKey = 'GET /api/templates/:templateId/variations';

  try {
    if (!isPgEnabled()) {
      const body = {
        templateId: req.params.templateId,
        total: 0,
        items: [],
      };
      await recordApiRequest({
        req,
        routeKey,
        statusCode: 200,
        requestSummary: { templateId: req.params.templateId, query: req.query },
        responseSummary: summarizeResponseBody(body),
        startedAt,
      });
      return res.json(body);
    }

    const { templateId } = req.params;
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 50);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);

    const { total, items } = await listPublicVariations(templateId, { limit, offset });
    const body = { templateId, total, items };
    await recordApiRequest({
      req,
      routeKey,
      statusCode: 200,
      requestSummary: { templateId, limit, offset },
      responseSummary: summarizeResponseBody({ templateId, total, itemCount: items.length }),
      startedAt,
    });
    res.json(body);
  } catch (err) {
    console.error('Variations fetch error:', err);
    await recordApiRequest({
      req,
      routeKey,
      statusCode: 500,
      requestSummary: { templateId: req.params.templateId },
      responseSummary: summarizeResponseBody({ error: err.message }),
      startedAt,
    });
    res.status(500).json({ error: err.message });
  }
});

// Paid template catalog / detail / image (x402)
router.use('/templates', templatesRouter);

// 1. START SESSION (Upload Image & Get Vision Strategy)
router.post('/sessions/start', upload.single('image'), async (req, res) => {
  if (!isPgEnabled()) return dbUnavailable(res);

  const startedAt = Date.now();
  const routeKey = 'POST /api/sessions/start';
  const sessionId = uuidv4();
  const payment = capturePaymentMeta(req, routeKey);
  const { customTarget, templateId, category, templateFilename, creatorWallet } = req.body || {};

  try {
    if (!req.file) {
      await recordApiRequest({
        req,
        routeKey,
        statusCode: 400,
        sessionId,
        creatorWallet,
        payment,
        requestSummary: summarizeMultipartFields(req.body),
        responseSummary: summarizeResponseBody({ error: 'No image provided' }),
        startedAt,
      });
      return res.status(400).json({ error: 'No image provided' });
    }

    const fileMeta = {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
    };

    const uploadStarted = Date.now();
    const imageUrl = await uploadImageToStableStudio(req.file.path);

    await createSession({
      sessionId,
      originalImageUrl: imageUrl,
      userCustomTarget: customTarget,
      templateId,
      category,
      templateFilename,
      creatorWallet,
    });

    await insertSessionStage({
      sessionId,
      stage: 'image_upload',
      attempt: 1,
      latencyMs: Date.now() - uploadStarted,
      input: {
        file: fileMeta,
        fields: summarizeMultipartFields(req.body),
      },
      output: { image_url: imageUrl },
    });

    await appendSessionPayment(sessionId, payment);

    const strategy = await runTimedStage(
      sessionId,
      'vision_strategy',
      1,
      () => getVisionInteractiveStrategy(imageUrl, customTarget),
      {
        image_url: imageUrl,
        custom_target: customTarget || null,
        model: 'gpt-4o',
        provider: 'netintel',
      }
    );

    await updateSessionVision(sessionId, strategy);

    const body = { sessionId, imageUrl, strategy };
    await recordApiRequest({
      req,
      routeKey,
      statusCode: 200,
      sessionId,
      creatorWallet,
      payment,
      requestSummary: { ...summarizeMultipartFields(req.body), file: fileMeta },
      responseSummary: summarizeResponseBody({
        sessionId,
        imageUrl,
        strategyElementCount: strategy?.elements?.length || 0,
      }),
      startedAt,
    });

    res.json(body);
  } catch (err) {
    console.error('Session start error:', err);
    try {
      await updateSessionError(sessionId, err.message);
    } catch {
      // ignore secondary write failure
    }
    await recordApiRequest({
      req,
      routeKey,
      statusCode: 500,
      sessionId,
      creatorWallet,
      payment,
      requestSummary: summarizeMultipartFields(req.body),
      responseSummary: summarizeResponseBody({ error: err.message }),
      startedAt,
    });
    res.status(500).json({ error: err.message });
  }
});

// 2. GENERATE BRANDED IMAGE
router.post('/generate', async (req, res) => {
  if (!isPgEnabled()) return dbUnavailable(res);

  const startedAt = Date.now();
  const routeKey = 'POST /api/generate';
  const payment = capturePaymentMeta(req, routeKey);
  const { sessionId, userCuratedChoices } = req.body || {};

  try {
    const session = await findSession(sessionId);
    if (!session) {
      await recordApiRequest({
        req,
        routeKey,
        statusCode: 404,
        sessionId,
        payment,
        requestSummary: summarizeRequestBody(req.body),
        responseSummary: summarizeResponseBody({ error: 'Session not found' }),
        startedAt,
      });
      return res.status(404).json({ error: 'Session not found' });
    }

    const prompts = userCuratedChoices.map((c) => `For ${c.element}: ${c.idea}`);
    const compiledPrompt = `${prompts.join(' ')} Ensure the rest of the original meme remains 100% untouched. DO NOT alter the original art style.`;

    await updateSessionGenerationPrep(sessionId, userCuratedChoices, compiledPrompt);
    await appendSessionPayment(sessionId, payment);

    let engineUsed = 'flux-2-pro';
    let result;
    let generationAttempt = 1;

    const runGeneration = async (engine, endpoint, attempt) => {
      const submitResult = await runTimedStage(
        sessionId,
        'generation_submit',
        attempt,
        () => submitEditJob(session.originalImageUrl, compiledPrompt, endpoint),
        {
          engine,
          endpoint,
          image_url: session.originalImageUrl,
          compiled_prompt: compiledPrompt,
          reference_logos: true,
        }
      );

      await updateSessionJobId(sessionId, submitResult.jobId);

      return runTimedStage(
        sessionId,
        'generation_poll',
        attempt,
        () => pollJobUntilComplete(submitResult.pollUrl, submitResult.jobId, () => {}),
        {
          engine,
          job_id: submitResult.jobId,
          poll_url: submitResult.pollUrl,
        }
      );
    };

    try {
      result = await runGeneration(engineUsed, undefined, generationAttempt);
    } catch (err) {
      if (err.message.includes('sensitive') || err.message.includes('E005')) {
        console.log('Fallback to GPT-Image-2');
        engineUsed = 'gpt-image-2';
        generationAttempt = 2;
        const fallbackEndpoint = '/api/generate/gpt-image-2/edit';
        result = await runGeneration(engineUsed, fallbackEndpoint, generationAttempt);
      } else {
        throw err;
      }
    }

    await updateSessionGenerated(sessionId, {
      engineUsed,
      generatedImageUrl: result.imageUrl,
    });

    const body = {
      sessionId,
      generatedImageUrl: result.imageUrl,
      engineUsed,
    };

    await recordApiRequest({
      req,
      routeKey,
      statusCode: 200,
      sessionId,
      creatorWallet: session.creatorWallet,
      payment,
      requestSummary: summarizeRequestBody(req.body),
      responseSummary: summarizeResponseBody(body),
      startedAt,
    });

    res.json(body);
  } catch (err) {
    console.error('Generation error:', err);
    if (sessionId) {
      try {
        await updateSessionError(sessionId, err.message);
      } catch {
        // ignore secondary write failure
      }
    }
    await recordApiRequest({
      req,
      routeKey,
      statusCode: 500,
      sessionId,
      payment,
      requestSummary: summarizeRequestBody(req.body),
      responseSummary: summarizeResponseBody({ error: err.message }),
      startedAt,
    });
    res.status(500).json({ error: err.message });
  }
});

// 3. RATE SESSION
router.post('/sessions/rate', async (req, res) => {
  if (!isPgEnabled()) return dbUnavailable(res);

  const startedAt = Date.now();
  const routeKey = 'POST /api/sessions/rate';
  const payment = capturePaymentMeta(req, routeKey);
  const { sessionId, rating } = req.body || {};

  try {
    const session = await rateSession(sessionId, rating);
    if (!session) {
      await recordApiRequest({
        req,
        routeKey,
        statusCode: 404,
        sessionId,
        payment,
        requestSummary: summarizeRequestBody(req.body),
        responseSummary: summarizeResponseBody({ error: 'Session not found' }),
        startedAt,
      });
      return res.status(404).json({ error: 'Session not found' });
    }

    await appendSessionPayment(sessionId, payment);

    const body = { success: true, session };
    await recordApiRequest({
      req,
      routeKey,
      statusCode: 200,
      sessionId,
      creatorWallet: session.creatorWallet,
      payment,
      requestSummary: summarizeRequestBody(req.body),
      responseSummary: summarizeResponseBody({ success: true, rating }),
      startedAt,
    });

    res.json(body);
  } catch (err) {
    console.error('Rating error:', err);
    await recordApiRequest({
      req,
      routeKey,
      statusCode: 500,
      sessionId,
      payment,
      requestSummary: summarizeRequestBody(req.body),
      responseSummary: summarizeResponseBody({ error: err.message }),
      startedAt,
    });
    res.status(500).json({ error: err.message });
  }
});

export default router;
