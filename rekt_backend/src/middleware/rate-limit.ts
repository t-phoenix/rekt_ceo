import rateLimit from 'express-rate-limit';
import { config } from '../config';

// Note: Using in-memory store for now to avoid Redis connection issues at startup
// Redis will be used for nonce storage in auth service, which is more critical
// Rate limiting with in-memory store works fine for single-instance deployments
// For multi-instance, consider using Redis store once connection is stable

// General rate limiter
export const generalLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMaxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  // Using default memory store - works fine for single instance
  message: { success: false, error: 'Too many requests, please try again later' },
});

// Auth endpoints rate limiter (stricter)
export const authLimiter = rateLimit({
  windowMs: 60000, // 1 minute
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many authentication attempts' },
});

// Mint endpoints rate limiter
// Note: This uses IP-based limiting as DDoS protection.
// Per-user concurrent request limiting is handled by mintQueueService.
export const mintLimiter = rateLimit({
  windowMs: 60000, // 1 minute
  max: 10, // Generous limit - per-user limiting is handled by queue service
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many mint requests, please slow down' },
});

