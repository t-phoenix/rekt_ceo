import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import { redisManager } from '../utils/redis';
import { logger } from '../utils/logger';

function createLazyRedisLimiter(opts: {
  prefix: string;
  windowMs: number;
  max: number;
  message: object;
  keyGenerator?: (req: Request) => string;
}): (req: Request, res: Response, next: NextFunction) => void {
  let limiter: RateLimitRequestHandler | null = null;
  let initialising = false;

  const memoryFallback = rateLimit({
    windowMs: opts.windowMs,
    max: opts.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: opts.message,
    ...(opts.keyGenerator ? { keyGenerator: opts.keyGenerator } : {}),
  });

  const buildRedisLimiter = async (): Promise<RateLimitRequestHandler> => {
    const client = await redisManager.getClient();
    if (!client) {
      logger.warn(`Rate limiter [${opts.prefix}]: Redis unavailable, using in-memory store`);
      return memoryFallback;
    }
    return rateLimit({
      windowMs: opts.windowMs,
      max: opts.max,
      standardHeaders: true,
      legacyHeaders: false,
      message: opts.message,
      ...(opts.keyGenerator ? { keyGenerator: opts.keyGenerator } : {}),
      store: new RedisStore({
        prefix: `rl:${opts.prefix}:`,
        sendCommand: (...args: string[]) => (client as any).call(...args),
      }),
    });
  };

  return (req: Request, res: Response, next: NextFunction) => {
    if (limiter) {
      return limiter(req, res, next);
    }
    if (!initialising) {
      initialising = true;
      buildRedisLimiter()
        .then((l) => {
          limiter = l;
          logger.info(`Rate limiter [${opts.prefix}]: Redis store active`);
        })
        .catch((err) => {
          logger.error(`Rate limiter [${opts.prefix}]: Failed to build Redis store`, err);
          limiter = memoryFallback;
        });
    }
    return memoryFallback(req, res, next);
  };
}

export const generalLimiter = createLazyRedisLimiter({
  prefix: 'campaign-general',
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMaxRequests,
  message: { success: false, error: 'Too many requests, please try again later' },
});

export const inviteRedeemLimiter = createLazyRedisLimiter({
  prefix: 'invite-redeem',
  windowMs: 60 * 60 * 1000,
  max: 12,
  message: { success: false, error: 'Too many invite attempts — try again later' },
  keyGenerator: (req) => `${req.ip}:${(req as { user?: { address?: string } }).user?.address || 'anon'}`,
});

export const inviteRotateLimiter = createLazyRedisLimiter({
  prefix: 'invite-rotate',
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: { success: false, error: 'Too many batch rotations — try again later' },
  keyGenerator: (req) => `${req.ip}:${(req as { user?: { address?: string } }).user?.address || 'anon'}`,
});

export const inviteValidateLimiter = createLazyRedisLimiter({
  prefix: 'invite-validate',
  windowMs: 60 * 60 * 1000,
  max: 40,
  message: { success: false, error: 'Too many invite checks — try again later' },
});

export const xMissionVerifyLimiter = createLazyRedisLimiter({
  prefix: 'x-mission-verify',
  windowMs: 60 * 60 * 1000,
  max: 40,
  message: { success: false, error: 'Too many verify attempts — try again later' },
  keyGenerator: (req) =>
    `${req.ip}:${(req as { user?: { address?: string } }).user?.address || 'anon'}`,
});

export const onchainCampaignVerifyLimiter = createLazyRedisLimiter({
  prefix: 'onchain-campaign-verify',
  windowMs: 60 * 60 * 1000,
  max: 60,
  message: { success: false, error: 'Too many on-chain verification attempts — try again later' },
  keyGenerator: (req) =>
    `${req.ip}:${(req as { user?: { address?: string } }).user?.address || 'anon'}:${(req as { params?: { campaignId?: string } }).params?.campaignId || '*'}`,
});
