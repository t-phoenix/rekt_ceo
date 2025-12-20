import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Define configuration schema with Zod
const configSchema = z.object({
  // Server
  port: z.string().transform(Number).pipe(z.number().min(1).max(65535)),
  nodeEnv: z.enum(['development', 'production', 'test']),
  
  // Blockchain
  chainId: z.string().transform(Number),
  rpcUrl: z.string().url(),
  rpcUrlFallback: z.string().url().optional(),
  backendPrivateKey: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  
  // Contract addresses
  minterContractAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  pfpCollectionAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  memeCollectionAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  ceoTokenAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  
  // IPFS/Pinata
  pinataJwt: z.string().min(1),
  pinataGateway: z.string().url(),
  
  // JWT
  jwtSecret: z.string().min(32),
  jwtExpiry: z.string().default('24h'),
  
  // CORS
  corsOrigin: z.string(),
  
  // Redis
  redisUrl: z.string().url(),
  
  // Rate limiting
  rateLimitWindowMs: z.string().transform(Number).default('60000'),
  rateLimitMaxRequests: z.string().transform(Number).default('100'),
  
  // Logging
  logLevel: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

// Parse and validate environment variables
const env = {
  port: process.env.PORT || '3000',
  nodeEnv: process.env.NODE_ENV || 'development',
  chainId: process.env.CHAIN_ID!,
  rpcUrl: process.env.RPC_URL!,
  rpcUrlFallback: process.env.RPC_URL_FALLBACK,
  backendPrivateKey: process.env.BACKEND_PRIVATE_KEY!,
  minterContractAddress: process.env.MINTER_CONTRACT_ADDRESS!,
  pfpCollectionAddress: process.env.PFP_COLLECTION_ADDRESS!,
  memeCollectionAddress: process.env.MEME_COLLECTION_ADDRESS!,
  ceoTokenAddress: process.env.CEO_TOKEN_ADDRESS!,
  pinataJwt: process.env.PINATA_JWT!,
  pinataGateway: process.env.PINATA_GATEWAY || 'https://gateway.pinata.cloud',
  jwtSecret: process.env.JWT_SECRET!,
  jwtExpiry: process.env.JWT_EXPIRY || '24h',
  corsOrigin: process.env.CORS_ORIGIN || process.env.CORS_ORIGIN_2,
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  rateLimitWindowMs: process.env.RATE_LIMIT_WINDOW_MS || '60000',
  rateLimitMaxRequests: process.env.RATE_LIMIT_MAX_REQUESTS || '100',
  logLevel: process.env.LOG_LEVEL || 'info',
};

// Validate configuration
const parseResult = configSchema.safeParse(env);

if (!parseResult.success) {
  console.error('❌ Invalid configuration:');
  console.error(parseResult.error.format());
  process.exit(1);
}

// Export validated config
export const config = parseResult.data;

// Export NFT type enum to match contract
export const NFTType = {
  PFP: 0,
  MEME: 1,
} as const;

export type NFTTypeValue = typeof NFTType[keyof typeof NFTType];

