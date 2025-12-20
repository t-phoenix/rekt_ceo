import { Router, IRouter } from 'express';
import { mintController } from '../controllers/mint.controller';
import { authMiddleware } from '../middleware/auth';

const router: IRouter = Router();

// POST /api/mint/initiate (protected)
router.post('/initiate', authMiddleware, (req, res, next) => mintController.initiateMint(req, res, next));

export default router;

