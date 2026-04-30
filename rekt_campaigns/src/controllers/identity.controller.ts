import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { ApiResponse, AppError } from '../types';
import { identityService } from '../services/identity.service';
import { campaignService } from '../services/campaign.service';
import { twitterService } from '../services/twitter.service';
import { discordService } from '../services/discord.service';
import { telegramService } from '../services/telegram.service';
import { config } from '../config';
import { logger } from '../utils/logger';

const PROVIDERS = ['x', 'discord', 'telegram', 'solana'] as const;
type Provider = (typeof PROVIDERS)[number];

function parseProvider(value: unknown): Provider {
  if (typeof value !== 'string' || !PROVIDERS.includes(value as Provider)) {
    throw new AppError(400, `Invalid provider. Allowed: ${PROVIDERS.join(', ')}`);
  }
  return value as Provider;
}

function frontendUrl(): string {
  const direct = process.env.FRONTEND_URL;
  if (direct) return direct.replace(/\/$/, '');
  // Fall back to the first CORS origin we know about.
  const cors = (process.env.CORS_ORIGIN || '').split(',')[0]?.trim();
  if (cors) return cors.replace(/\/$/, '');
  return 'http://localhost:3001';
}


export class IdentityController {
  async getMine(req: Request, res: Response, next: NextFunction) {
    try {
      const address = req.user?.address;
      if (!address) throw new AppError(401, 'Authentication required');
      const data = await campaignService.getIdentity(address);
      res.json({ success: true, data } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Manual link fallback. Useful for Solana addresses (until we add a Solana
   * sign-in flow) and as an admin-only escape hatch. Real X / Discord /
   * Telegram flows go through the dedicated endpoints below.
   */
  async link(req: Request, res: Response, next: NextFunction) {
    try {
      const address = req.user?.address;
      if (!address) throw new AppError(401, 'Authentication required');

      const provider = parseProvider(req.body?.provider);
      const handle = typeof req.body?.handle === 'string' ? req.body.handle.trim() : '';
      if (!handle) throw new AppError(400, 'Handle is required');

      const data = await identityService.markLinked(address, provider, handle);
      res.json({ success: true, data } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }

  async unlink(req: Request, res: Response, next: NextFunction) {
    try {
      const address = req.user?.address;
      if (!address) throw new AppError(401, 'Authentication required');
      const provider = parseProvider(req.body?.provider);
      const data = await identityService.unlink(address, provider);
      res.json({ success: true, data } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }

  async issueInvite(req: Request, res: Response, next: NextFunction) {
    try {
      const address = req.user?.address;
      if (!address) throw new AppError(401, 'Authentication required');
      try {
        const batch = await campaignService.ensureInviteSlots(address);
        res.json({ success: true, data: { batch } } as ApiResponse);
      } catch (e) {
        if ((e as Error).message === 'redis_unavailable') {
          throw new AppError(503, 'Invite service temporarily unavailable');
        }
        throw e;
      }
    } catch (error) {
      next(error);
    }
  }

  // ── X (Twitter) OAuth 2.0 (PKCE) ────────────────────────────────────

  /**
   * Returns the URL the frontend should redirect the user to for X OAuth
   * consent. Mirrors the Discord pattern:
   *   - We embed `address` and a `vid` (verifier-id) in a short-lived signed
   *     `state` JWT so the callback can identify the connecting wallet.
   *   - The PKCE `code_verifier` itself is stashed server-side keyed by
   *     `vid` so it never travels through the user's browser.
   */
  async getXOAuthUrl(req: Request, res: Response, next: NextFunction) {
    try {
      const address = req.user?.address;
      if (!address) throw new AppError(401, 'Authentication required');
      if (!twitterService.isOAuthConfigured()) {
        throw new AppError(
          503,
          'X OAuth not configured (X_CLIENT_ID missing). See docs/launch-hub/INTEGRATIONS_X.md.',
        );
      }

      const verifier = twitterService.generateCodeVerifier();
      const challenge = twitterService.codeChallengeFromVerifier(verifier);
      const vid = crypto.randomBytes(16).toString('hex');
      await campaignService.setOAuthVerifier(vid, verifier, 600);

      const state = jwt.sign(
        { address, vid, kind: 'x-oauth' },
        config.jwtSecret as string,
        { expiresIn: '10m' },
      );
      const url = twitterService.buildAuthorizeUrl(state, challenge);
      res.json({ success: true, data: { url } } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }

  /**
   * X redirects the user here after consent. We:
   *   1) decode `state` to recover (address, vid),
   *   2) consume the PKCE verifier from our store,
   *   3) exchange `code` for an access token,
   *   4) fetch /2/users/me,
   *   5) optionally check follows @rekt_ceo via /2/users/:id/following,
   *   6) markLinked + persist xId/xFollowsRektCeo,
   *   7) redirect back to the frontend with ?x=ok|fail.
   */
  async xCallback(req: Request, res: Response, _next: NextFunction) {
    const fe = frontendUrl();
    const code = String(req.query?.code || '');
    const stateRaw = String(req.query?.state || '');
    const error = req.query?.error ? String(req.query.error) : '';

    const failRedirect = (reason: string) =>
      res.redirect(`${fe}/launch?x=fail&reason=${encodeURIComponent(reason)}`);

    if (error) {
      logger.warn('X OAuth user-side error', { error });
      return failRedirect(error);
    }
    if (!code || !stateRaw) return failRedirect('missing_params');

    try {
      let address: string;
      let vid: string;
      try {
        const decoded = jwt.verify(stateRaw, config.jwtSecret) as any;
        if (!decoded?.address || !decoded?.vid || decoded?.kind !== 'x-oauth') {
          return failRedirect('bad_state');
        }
        address = String(decoded.address).toLowerCase();
        vid = String(decoded.vid);
      } catch {
        return failRedirect('bad_state');
      }

      const verifier = await campaignService.consumeOAuthVerifier(vid);
      if (!verifier) return failRedirect('expired_state');

      const tokens = await twitterService.exchangeCode(code, verifier);
      const user = await twitterService.getMe(tokens.access_token);

      // Optional follow-graph check via the freshly-issued bearer token.
      // If follows.read scope was denied or rate-limited, we keep `null` and
      // surface "FOLLOW CHECK SKIPPED" on the UI instead of softlocking.
      const targetUsername = (process.env.X_FOLLOW_TARGET || 'rekt_ceo').replace(/^@/, '');
      let follows: boolean | null = null;
      const targetId = await twitterService.resolveUserIdByUsername(
        tokens.access_token,
        targetUsername,
      );
      if (targetId) {
        follows = await twitterService.checkFollowsViaOAuth(
          tokens.access_token,
          user.id,
          targetId,
        );
      }

      const handle = `@${user.username}`;

      if (follows === false) {
        return res.redirect(
          `${fe}/launch?x=fail&reason=not_following&handle=${encodeURIComponent(handle)}`,
        );
      }

      await identityService.markLinked(address, 'x', handle);
      const identity = await campaignService.setIdentityField(address, {
        xId: user.id,
        xEmail: user.confirmed_email || null,
        xFollowsRektCeo: follows,
      });
      logger.info('X linked', {
        address,
        xId: user.id,
        handle,
        follows,
        hasEmail: !!user.confirmed_email,
      });

      void identity;
      return res.redirect(`${fe}/launch?x=ok&handle=${encodeURIComponent(handle)}`);
    } catch (err) {
      logger.warn('X callback failed', { error: (err as Error).message });
      return failRedirect('exchange_failed');
    }
  }

  // ── Discord OAuth ───────────────────────────────────────────────────

  /**
   * Returns the URL the frontend should redirect the user to for Discord
   * OAuth consent. We embed a short-lived signed JWT in `state` so the
   * callback can identify the connecting wallet without a session cookie.
   */
  async getDiscordOAuthUrl(req: Request, res: Response, next: NextFunction) {
    try {
      const address = req.user?.address;
      if (!address) throw new AppError(401, 'Authentication required');
      if (!discordService.isConfigured()) {
        throw new AppError(503, 'Discord OAuth not configured (DISCORD_CLIENT_ID / DISCORD_CLIENT_SECRET missing)');
      }
      const state = jwt.sign({ address, kind: 'discord-oauth' }, config.jwtSecret as string, { expiresIn: '10m' });
      const url = discordService.buildAuthorizeUrl(state);
      res.json({ success: true, data: { url } } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Discord redirects the user here. We:
   *   1) decode `state` to recover the address,
   *   2) exchange `code` for an access token,
   *   3) fetch /users/@me,
   *   4) verify guild membership via the bot token (when configured),
   *   5) markLinked,
   *   6) redirect back to the frontend with ?discord=ok|fail.
   */
  async discordCallback(req: Request, res: Response, _next: NextFunction) {
    const fe = frontendUrl();
    const code = String(req.query?.code || '');
    const stateRaw = String(req.query?.state || '');

    const failRedirect = (reason: string) =>
      res.redirect(`${fe}/launch?discord=fail&reason=${encodeURIComponent(reason)}`);

    try {
      if (!code || !stateRaw) return failRedirect('missing_params');

      let address: string;
      try {
        const decoded = jwt.verify(stateRaw, config.jwtSecret) as any;
        if (!decoded?.address || decoded?.kind !== 'discord-oauth') return failRedirect('bad_state');
        address = String(decoded.address).toLowerCase();
      } catch {
        return failRedirect('bad_state');
      }

      const tokens = await discordService.exchangeCode(code);
      const user = await discordService.getMe(tokens.access_token);
      const member = await discordService.isMember(user.id);

      const handle = discordService.formatHandle(user);
      await identityService.markLinked(address, 'discord', handle);
      await campaignService.setIdentityField(address, {
        discordId: user.id,
        discordEmail: user.email || null,
        discordEmailVerified:
          typeof user.verified === 'boolean' ? user.verified : null,
        discordInGuild: member,
      });
      logger.info('Discord linked', {
        address,
        userId: user.id,
        member,
        hasEmail: !!user.email,
      });

      if (member === false) {
        return res.redirect(
          `${fe}/launch?discord=fail&reason=not_in_guild&user=${encodeURIComponent(user.username)}`,
        );
      }

      return res.redirect(
        `${fe}/launch?discord=ok&handle=${encodeURIComponent(handle)}`,
      );
    } catch (error) {
      logger.warn('Discord callback failed', { error: (error as Error).message });
      return failRedirect('exchange_failed');
    }
  }

  // ── Telegram Login Widget ───────────────────────────────────────────

  async telegramConfig(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({
        success: true,
        data: {
          configured: telegramService.isConfigured(),
          botUsername: telegramService.botUsername(),
        },
      } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }

  async verifyTelegram(req: Request, res: Response, next: NextFunction) {
    try {
      const address = req.user?.address;
      if (!address) throw new AppError(401, 'Authentication required');
      const payload = req.body || {};
      if (!payload?.id || !payload?.hash) throw new AppError(400, 'Missing Telegram payload');

      const result = telegramService.verifyLoginPayload(payload);
      if (!result.ok) {
        throw new AppError(400, `Telegram verify failed: ${result.reason}`);
      }

      const member = await telegramService.isMember(payload.id);
      const handle = telegramService.formatHandle(payload);
      await identityService.markLinked(address, 'telegram', handle);
      const identity = await campaignService.setIdentityField(address, {
        telegramInGroup: member,
      });

      if (member === false) {
        return res.status(409).json({
          success: false,
          error: 'NOT_IN_GROUP',
          message: 'Join the Rekt CEO Telegram group, then verify again.',
          data: { identity, handle, member },
        } as ApiResponse);
      }

      res.json({ success: true, data: { identity, handle, member } } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }
}

export const identityController = new IdentityController();
