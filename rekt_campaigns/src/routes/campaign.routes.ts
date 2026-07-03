import { Router, IRouter } from 'express';
import { campaignController } from '../controllers/campaign.controller';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth';
import {
  inviteRedeemLimiter,
  inviteRotateLimiter,
  inviteValidateLimiter,
  xMissionVerifyLimiter,
  onchainCampaignVerifyLimiter,
} from '../middleware/rate-limit';

const router: IRouter = Router();

router.get('/launch-hub-layout', (req, res, next) => campaignController.getLayout(req, res, next));
router.get('/launch-hub-bootstrap', optionalAuthMiddleware, (req, res, next) =>
  campaignController.getBootstrap(req, res, next),
);
router.post('/x-mission/verify', authMiddleware, xMissionVerifyLimiter, (req, res, next) =>
  campaignController.verifyXMission(req, res, next),
);
router.get('/list', (req, res, next) => campaignController.getCampaigns(req, res, next));
router.get('/leaderboard', (req, res, next) => campaignController.getLeaderboard(req, res, next));

router.post('/refresh-base-balance', authMiddleware, (req, res, next) =>
  campaignController.refreshBaseBalance(req, res, next),
);

router.post('/invite/validate', inviteValidateLimiter, (req, res, next) =>
  campaignController.validateInvite(req, res, next),
);
router.post('/invite/redeem', authMiddleware, inviteRedeemLimiter, (req, res, next) =>
  campaignController.redeemInvite(req, res, next),
);
router.post('/invite/rotate-batch', authMiddleware, inviteRotateLimiter, (req, res, next) =>
  campaignController.rotateInviteBatch(req, res, next),
);
router.get('/invite/history', authMiddleware, (req, res, next) =>
  campaignController.getMyInviteHistory(req, res, next),
);

router.post(
  '/:campaignId/onchain-verify',
  authMiddleware,
  onchainCampaignVerifyLimiter,
  (req, res, next) => campaignController.verifyOnchainCampaign(req, res, next),
);

export default router;
