import { Router, IRouter } from 'express';
import { identityController } from '../controllers/identity.controller';
import { authMiddleware } from '../middleware/auth';

const router: IRouter = Router();

// Read identity blob + manual link (Solana fallback)
router.get('/me', authMiddleware, (req, res, next) => identityController.getMine(req, res, next));
router.post('/link', authMiddleware, (req, res, next) => identityController.link(req, res, next));
router.post('/unlink', authMiddleware, (req, res, next) => identityController.unlink(req, res, next));
router.post('/invite', authMiddleware, (req, res, next) => identityController.issueInvite(req, res, next));

// X (Twitter) OAuth 2.0 (PKCE)
router.get('/x/oauth-url', authMiddleware, (req, res, next) =>
  identityController.getXOAuthUrl(req, res, next),
);
// NOTE: X redirects the *browser* here, so this endpoint is intentionally
// unauthenticated. Identity is recovered from the signed `state` JWT.
router.get('/x/callback', (req, res, next) =>
  identityController.xCallback(req, res, next),
);

// Discord OAuth2
router.get('/discord/oauth-url', authMiddleware, (req, res, next) =>
  identityController.getDiscordOAuthUrl(req, res, next),
);
// NOTE: Discord redirects the *browser* here, so this endpoint is intentionally
// unauthenticated. Identity is recovered from the signed `state` JWT.
router.get('/discord/callback', (req, res, next) =>
  identityController.discordCallback(req, res, next),
);

// Telegram Login Widget
router.get('/telegram/config', (req, res, next) => identityController.telegramConfig(req, res, next));
router.post('/telegram/verify', authMiddleware, (req, res, next) =>
  identityController.verifyTelegram(req, res, next),
);

export default router;
