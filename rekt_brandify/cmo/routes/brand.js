import express from 'express';
import { requireAdmin } from '../middleware/adminAuth.js';
import { getBrandProfile, updateBrandProfile } from '../db/brandProfile.js';
import {
  listProductFeatures,
  createProductFeature,
  updateProductFeature,
  deleteProductFeature,
  getProductFeaturesByIds,
} from '../db/productFeatures.js';
import {
  listPromptMemory,
  createPromptMemory,
  acceptPromptMemory,
} from '../db/promptMemory.js';
import { analyzeBrandFromUrl, enrichFeatureFromUrl } from '../services/brand-agency.js';
import { extractPayerHint } from '../services/paid-run.js';

const router = express.Router();

router.get('/brand', requireAdmin, async (_req, res) => {
  try {
    const data = await getBrandProfile();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.patch('/brand', requireAdmin, async (req, res) => {
  try {
    const data = await updateBrandProfile(req.body || {});
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** Paid via x402 — AgentCash brand agency analysis */
router.post('/brand/analyze', async (req, res) => {
  try {
    const websiteUrl = req.body?.websiteUrl || req.body?.website_url || req.body?.url;
    const extraUrls = req.body?.extraUrls || req.body?.extra_urls || [];
    const persistFeatures = req.body?.persistFeatures !== false;
    const data = await analyzeBrandFromUrl({
      websiteUrl,
      extraUrls,
      persistFeatures,
      payerHint: extractPayerHint(req),
    });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/features', requireAdmin, async (req, res) => {
  try {
    const activeOnly = String(req.query.active || '') === '1';
    const category = req.query.category ? String(req.query.category) : null;
    const ids = req.query.ids
      ? String(req.query.ids).split(',').map((s) => s.trim()).filter(Boolean)
      : null;
    const data = ids?.length
      ? await getProductFeaturesByIds(ids)
      : await listProductFeatures({ activeOnly, category, limit: 100 });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/features', requireAdmin, async (req, res) => {
  try {
    const data = await createProductFeature(req.body || {});
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.patch('/features/:id', requireAdmin, async (req, res) => {
  try {
    const data = await updateProductFeature(req.params.id, req.body || {});
    if (!data) return res.status(404).json({ success: false, error: 'Feature not found' });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/features/:id', requireAdmin, async (req, res) => {
  try {
    await deleteProductFeature(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** Paid via x402 — enrich one feature URL */
router.post('/features/enrich', async (req, res) => {
  try {
    const data = await enrichFeatureFromUrl({
      url: req.body?.url,
      title: req.body?.title || null,
      payerHint: extractPayerHint(req),
    });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/prompt-memory', requireAdmin, async (req, res) => {
  try {
    const stage = req.query.stage ? String(req.query.stage) : null;
    const acceptedOnly = String(req.query.accepted || '') === '1';
    const data = await listPromptMemory({ stage, acceptedOnly, limit: 50 });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/prompt-memory', requireAdmin, async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.edited_prompt && !body.editedPrompt) {
      return res.status(400).json({ success: false, error: 'edited_prompt required' });
    }
    const data = await createPromptMemory({
      stage: body.stage || 'curate',
      featureId: body.feature_id || body.featureId || null,
      originalPrompt: body.original_prompt || body.originalPrompt || null,
      editedPrompt: body.edited_prompt || body.editedPrompt,
      diffNotes: body.diff_notes || body.diffNotes || null,
      accepted: body.accepted !== false,
      pipelineRunId: body.pipeline_run_id || body.pipelineRunId || null,
    });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/prompt-memory/:id/accept', requireAdmin, async (req, res) => {
  try {
    const accepted = req.body?.accepted !== false;
    const data = await acceptPromptMemory(req.params.id, accepted);
    if (!data) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
