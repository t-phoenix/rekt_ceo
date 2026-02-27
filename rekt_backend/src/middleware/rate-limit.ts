import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import { redisManager } from '../utils/redis';
import { logger } from '../utils/logger';

/**
 * Creates a rate limiter that lazily attaches a Redis store on first use.
 * Falls back to in-memory store if Redis is unavailable, so startup is never blocked.
 * This pattern avoids top-level await (incompatible with CommonJS module output).
 */
function createLazyRedisLimiter(opts: {
  prefix: string;
  windowMs: number;
  max: number;
  message: object;
}): (req: Request, res: Response, next: NextFunction) => void {
  let limiter: RateLimitRequestHandler | null = null;
  let initialising = false;

  const memoryFallback = rateLimit({
    windowMs: opts.windowMs,
    max: opts.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: opts.message,
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
      store: new RedisStore({
        prefix: `rl:${opts.prefix}:`,
        sendCommand: (...args: string[]) => (client as any).call(...args),
      }),
    });
  };

  return (req: Request, res: Response, next: NextFunction) => {
    // Already initialised — fast path
    if (limiter) {
      return limiter(req, res, next);
    }

    // First request: kick off async initialization, serve with memory limiter meanwhile
    if (!initialising) {
      initialising = true;
      buildRedisLimiter()
        .then((l) => {
          limiter = l;
          logger.info(`Rate limiter [${opts.prefix}]: Redis store active`);
        })
        .catch((err) => {
          logger.error(`Rate limiter [${opts.prefix}]: Failed to build Redis store`, err);
          limiter = memoryFallback; // permanent fallback
        });
    }

    // While initialising, use the in-memory fallback (only affects very first requests)
    return memoryFallback(req, res, next);
  };
}

// General rate limiter
export const generalLimiter = createLazyRedisLimiter({
  prefix: 'general',
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMaxRequests,
  message: { success: false, error: 'Too many requests, please try again later' },
});

// Auth endpoints rate limiter (stricter)
export const authLimiter = createLazyRedisLimiter({
  prefix: 'auth',
  windowMs: 60000, // 1 minute
  max: 10,
  message: { success: false, error: 'Too many authentication attempts' },
});

// Mint endpoints rate limiter
// Per-user concurrent request limiting is handled by the Redis-backed queue service.
export const mintLimiter = createLazyRedisLimiter({
  prefix: 'mint',
  windowMs: 60000, // 1 minute
  max: 10,
  message: { success: false, error: 'Too many mint requests, please slow down' },
});
