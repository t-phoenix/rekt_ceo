import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';
import { config } from '../config';

const redis = new Redis(config.redisUrl);

// General rate limiter
export const generalLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMaxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    // @ts-ignore - Redis types mismatch
    sendCommand: (...args: string[]) => redis.call(...args),
  }),
  message: { success: false, error: 'Too many requests, please try again later' },
});

// Auth endpoints rate limiter (stricter)
export const authLimiter = rateLimit({
  windowMs: 60000, // 1 minute
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    // @ts-ignore - Redis types mismatch
    sendCommand: (...args: string[]) => redis.call(...args),
  }),
  message: { success: false, error: 'Too many authentication attempts' },
});

// Mint endpoints rate limiter (very strict)
export const mintLimiter = rateLimit({
  windowMs: 60000, // 1 minute
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    // @ts-ignore - Redis types mismatch
    sendCommand: (...args: string[]) => redis.call(...args),
  }),
  message: { success: false, error: 'Too many mint requests, please slow down' },
});

