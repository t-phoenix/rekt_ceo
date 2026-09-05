import express from 'express';
import { requireAdmin } from '../middleware/adminAuth.js';
import { getWalletStatus } from '../services/agentcash-wallet.js';

const router = express.Router();

router.get('/status', requireAdmin, async (_req, res) => {
  try {
    const data = await getWalletStatus();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
