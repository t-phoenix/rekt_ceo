import express from 'express';
import researchRouter from './routes/research.js';
import strategyRouter from './routes/strategy.js';
import contentRouter from './routes/content.js';
import calendarRouter from './routes/calendar.js';
import inboxRouter from './routes/inbox.js';
import walletRouter from './routes/wallet.js';
import pipelineRouter from './routes/pipeline.js';
import brandRouter from './routes/brand.js';
import templatesRouter from './routes/templates.js';
import { getCmoConfig } from './services/config.js';

const router = express.Router();

router.get('/health', (_req, res) => {
  res.json({
    success: true,
    service: 'cmo-workshop',
    strategy_mode: getCmoConfig().strategyMode,
  });
});

router.use('/wallet', walletRouter);
router.use('/research', researchRouter);
router.use('/strategy', strategyRouter);
router.use('/content', contentRouter);
router.use('/calendar', calendarRouter);
router.use('/inbox', inboxRouter);
router.use('/pipeline', pipelineRouter);
router.use('/', brandRouter);
router.use('/', templatesRouter);

export { router as cmoRouter };
export default router;
