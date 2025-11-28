import { Router, IRouter } from 'express';
import { infoController } from '../controllers/info.controller';

const router: IRouter = Router();

// GET /api/info/pricing/:nftType
router.get('/pricing/:nftType', (req, res, next) => infoController.getPricing(req, res, next));

// GET /api/info/user/:address
router.get('/user/:address', (req, res, next) => infoController.getUserInfo(req, res, next));

// GET /api/info/ceo-price
router.get('/ceo-price', (req, res, next) => infoController.getCEOPrice(req, res, next));

export default router;

