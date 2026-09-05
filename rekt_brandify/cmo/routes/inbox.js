import express from 'express';
import { listInteractions, updateInteraction } from '../db/interactions.js';
import { requireAdmin } from '../middleware/adminAuth.js';
import { STRATEGY_PROMPT } from '../services/config.js';

const router = express.Router();

router.get('/', requireAdmin, async (req, res) => {
  try {
    const data = await listInteractions({
      status: req.query.status ? String(req.query.status) : undefined,
      platform: req.query.platform ? String(req.query.platform) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : 50,
    });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/:id/draft-reply', requireAdmin, async (req, res) => {
  try {
    const { context } = req.body || {};
    const draft = req.body?.draft_reply || [
      'Appreciate the energy.',
      context ? `Re: ${context}` : '',
      `Make a meme: rektceo.com/memes`,
      STRATEGY_PROMPT.slice(0, 120),
    ].filter(Boolean).join(' ');

    const data = await updateInteraction(req.params.id, {
      status: 'drafted',
      draft_reply: draft,
    });
    if (!data) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
