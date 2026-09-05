import express from 'express';
import {
  listContentItems,
  createContentItem,
  updateContentItem,
} from '../db/contentItems.js';
import { requireAdmin } from '../middleware/adminAuth.js';
import contentPackageRouter from './content-package.js';

const router = express.Router();

// Paid day/batch packages must be registered before /:id param routes
router.use('/', contentPackageRouter);

router.get('/', requireAdmin, async (req, res) => {
  try {
    const data = await listContentItems({
      status: req.query.status ? String(req.query.status) : undefined,
      platform: req.query.platform ? String(req.query.platform) : undefined,
      pipelineRunId: (req.query.pipeline_run_id || req.query.pipelineId)
        ? String(req.query.pipeline_run_id || req.query.pipelineId)
        : undefined,
      limit: req.query.limit ? Number(req.query.limit) : 50,
    });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const data = await createContentItem(req.body || {});
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Guard: never treat package path segments as content UUIDs
router.param('id', (req, res, next, id) => {
  if ([
    'day-package', 'batch-package', 'curate', 'select-template',
    'brandify', 'brandify-vision', 'brandify-generate', 'brandify-outputs',
    'brandify-output', 'brandify-draft', 'caption', 'compose', 'run-from-stage',
  ].includes(id)) {
    return res.status(404).json({ success: false, error: 'Not found' });
  }
  next();
});

router.patch('/:id', requireAdmin, async (req, res) => {
  try {
    const data = await updateContentItem(req.params.id, req.body || {});
    if (!data) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/:id/approve', requireAdmin, async (req, res) => {
  try {
    const data = await updateContentItem(req.params.id, { status: 'approved' });
    if (!data) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/:id/publish', requireAdmin, async (req, res) => {
  try {
    const data = await updateContentItem(req.params.id, {
      status: 'published',
      published_at: new Date().toISOString(),
    });
    if (!data) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
