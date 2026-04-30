import { Router, IRouter } from 'express';
import { adminController } from '../controllers/admin.controller';
import { adminAuthMiddleware } from '../middleware/admin-auth';

const router: IRouter = Router();

router.use(adminAuthMiddleware);

router.get('/launch-hub-layout', (req, res, next) => adminController.getLayout(req, res, next));
router.put('/launch-hub-layout', (req, res, next) => adminController.setLayout(req, res, next));

router.get('/campaigns', (req, res, next) => adminController.getCampaigns(req, res, next));
router.put('/campaigns', (req, res, next) => adminController.setCampaigns(req, res, next));

router.get('/x-rule-presets', (req, res, next) => adminController.getXRulePresets(req, res, next));
router.put('/x-rule-presets', (req, res, next) => adminController.setXRulePresets(req, res, next));

router.get('/gate-config', (req, res, next) => adminController.getGateConfig(req, res, next));
router.put('/gate-config', (req, res, next) => adminController.setGateConfig(req, res, next));

router.get('/xp-rewards', (req, res, next) => adminController.getXpRewards(req, res, next));
router.put('/xp-rewards', (req, res, next) => adminController.setXpRewards(req, res, next));

router.post('/invite-codes/mint', (req, res, next) => adminController.mintInviteCode(req, res, next));
router.get('/invite-ledger', (req, res, next) => adminController.getInviteLedger(req, res, next));

router.get('/analytics/summary', (req, res, next) => adminController.getAnalyticsSummary(req, res, next));
router.get('/users/:address', (req, res, next) => adminController.getAdminUser(req, res, next));
router.get('/leaderboard', (req, res, next) => adminController.getAdminLeaderboard(req, res, next));

export default router;
