import express from 'express';
import { listScheduledInRange } from '../db/contentItems.js';
import { updateContentItem } from '../db/contentItems.js';
import { requireAdmin } from '../middleware/adminAuth.js';

const router = express.Router();

router.get('/', requireAdmin, async (req, res) => {
  try {
    const start = req.query.start || new Date().toISOString();
    const end = req.query.end || new Date(Date.now() + 14 * 86400000).toISOString();
    const data = await listScheduledInRange(start, end);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/schedule', requireAdmin, async (req, res) => {
  try {
    const { id, scheduled_at } = req.body || {};
    if (!id || !scheduled_at) {
      return res.status(400).json({ error: 'id and scheduled_at required' });
    }
    const data = await updateContentItem(id, { status: 'scheduled', scheduled_at });
    if (!data) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
