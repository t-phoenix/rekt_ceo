import { Router, IRouter } from 'express';
import { dailyController } from '../controllers/daily.controller';
import { authMiddleware } from '../middleware/auth';

const router: IRouter = Router();

router.get('/state', authMiddleware, (req, res, next) => dailyController.getState(req, res, next));
router.post('/checkin', authMiddleware, (req, res, next) => dailyController.claimCheckin(req, res, next));
router.post('/spin', authMiddleware, (req, res, next) => dailyController.claimSpin(req, res, next));

export default router;
