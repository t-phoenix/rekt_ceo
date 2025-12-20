import { Router, IRouter } from 'express';
import { infoController } from '../controllers/info.controller';

const router: IRouter = Router();

// GET /api/info/pricing/:nftType
router.get('/pricing/:nftType', (req, res, next) => infoController.getPricing(req, res, next));

// GET /api/info/user/:address
router.get('/user/:address', (req, res, next) => infoController.getUserInfo(req, res, next));

// GET /api/info/ceo-price
router.get('/ceo-price', (req, res, next) => infoController.getCEOPrice(req, res, next));

// GET /api/info/permit-nonce/:address
router.get('/permit-nonce/:address', (req, res, next) => infoController.getPermitNonce(req, res, next));

// GET /api/info/ceo-balance/:address
router.get('/ceo-balance/:address', (req, res, next) => infoController.getCEOBalance(req, res, next));

export default router;

