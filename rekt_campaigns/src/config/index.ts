import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const configSchema = z.object({
  port: z.string().transform(Number).pipe(z.number().min(1).max(65535)),
  nodeEnv: z.enum(['development', 'production', 'test']),
  jwtSecret: z.string().min(32),
  jwtExpiry: z.string().default('24h'),
  corsOrigin: z.string(),
  redisUrl: z.string().url(),
  rateLimitWindowMs: z.string().transform(Number).default('60000'),
  rateLimitMaxRequests: z.string().transform(Number).default('100'),
  logLevel: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  /** Base / ETH RPC for eligibility checks (identity service). */
  rpcUrl: z.string().url(),
});

const env = {
  port: process.env.PORT || String(4047),
  nodeEnv: (process.env.NODE_ENV || 'development') as 'development' | 'production' | 'test',
  jwtSecret: process.env.JWT_SECRET!,
  jwtExpiry: process.env.JWT_EXPIRY || '24h',
  corsOrigin: [process.env.CORS_ORIGIN, process.env.CORS_ORIGIN_2].filter(Boolean).join(','),
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  rateLimitWindowMs: process.env.RATE_LIMIT_WINDOW_MS || '60000',
  rateLimitMaxRequests: process.env.RATE_LIMIT_MAX_REQUESTS || '100',
  logLevel: (process.env.LOG_LEVEL || 'info') as 'error' | 'warn' | 'info' | 'debug',
  rpcUrl: process.env.RPC_URL || process.env.BASE_RPC_URL || 'https://mainnet.base.org',
};

const parseResult = configSchema.safeParse(env);

if (!parseResult.success) {
  console.error('Invalid rekt_campaigns server configuration:');
  console.error(parseResult.error.format());
  process.exit(1);
}

export const config = parseResult.data;
