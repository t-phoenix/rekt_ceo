import { Router, IRouter } from 'express';
import { authController } from '../controllers/auth.controller';

const router: IRouter = Router();

// POST /api/auth/nonce
router.post('/nonce', (req, res, next) => authController.getNonce(req, res, next));

// POST /api/auth/verify
router.post('/verify', (req, res, next) => authController.verifySignature(req, res, next));

export default router;

