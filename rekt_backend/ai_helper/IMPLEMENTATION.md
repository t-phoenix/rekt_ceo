# Backend Implementation Guide

This document provides phase-by-phase implementation prompts for building the Rekt CEO backend. Each phase is designed to be self-contained and can be given to an AI coding assistant as a standalone prompt.

---

## Phase 1: Project Setup

### Objective
Initialize a TypeScript Node.js project with all dependencies, configuration files, and basic file structure.

### Tasks

**1.1 Create package.json**

```json
{
  "name": "rekt-ceo-backend",
  "version": "1.0.0",
  "description": "Backend API for Rekt CEO NFT minting platform",
  "main": "dist/index.js",
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "lint": "eslint src --ext .ts",
    "format": "prettier --write \"src/**/*.ts\""
  },
  "keywords": ["nft", "ethereum", "web3", "api"],
  "author": "Rekt CEO Team",
  "license": "MIT",
  "dependencies": {
    "express": "^4.18.2",
    "ethers": "^6.9.0",
    "siwe": "^2.1.4",
    "pinata-web3": "^0.1.0",
    "@pinata/sdk": "^2.1.0",
    "ioredis": "^5.3.2",
    "express-rate-limit": "^7.1.5",
    "rate-limit-redis": "^4.2.0",
    "helmet": "^7.1.0",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "zod": "^3.22.4",
    "winston": "^3.11.0",
    "jsonwebtoken": "^9.0.2",
    "sharp": "^0.33.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.17",
    "@types/node": "^20.10.0",
    "@types/jsonwebtoken": "^9.0.5",
    "typescript": "^5.3.3",
    "ts-node-dev": "^2.0.0",
    "@typescript-eslint/eslint-plugin": "^6.15.0",
    "@typescript-eslint/parser": "^6.15.0",
    "eslint": "^8.56.0",
    "prettier": "^3.1.1",
    "jest": "^29.7.0",
    "@types/jest": "^29.5.11",
    "ts-jest": "^29.1.1"
  }
}
```

**1.2 Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

**1.3 Create .env.example**

```bash
# Blockchain Configuration
CHAIN_ID=8453
RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
RPC_URL_FALLBACK=https://mainnet.base.org
BACKEND_PRIVATE_KEY=0x...

# Contract Addresses (update after deployment)
MINTER_CONTRACT_ADDRESS=0x...
PFP_COLLECTION_ADDRESS=0x...
MEME_COLLECTION_ADDRESS=0x...
CEO_TOKEN_ADDRESS=0x...

# IPFS/Pinata Configuration
PINATA_JWT=eyJhbGc...
PINATA_GATEWAY=https://gateway.pinata.cloud

# API Configuration
PORT=3000
NODE_ENV=development
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRY=24h

# CORS
CORS_ORIGIN=http://localhost:3001

# Redis
REDIS_URL=redis://localhost:6379

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
```

**1.4 Create .gitignore**

```
# Dependencies
node_modules/
package-lock.json
yarn.lock

# Build
dist/
build/
*.tsbuildinfo

# Environment
.env
.env.local
.env.*.local

# Logs
logs/
*.log
npm-debug.log*

# IDE
.vscode/
.idea/
*.swp
*.swo
*.swn

# OS
.DS_Store
Thumbs.db

# Test
coverage/
.nyc_output/

# Misc
*.pem
*.key
.cache/
temp/
```

**1.5 Create docker-compose.yml (for local development)**

```yaml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes

volumes:
  redis_data:
```

**1.6 Create basic directory structure**

```
backend/
├── src/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   ├── types/
│   ├── abi/
│   └── index.ts
├── tests/
│   ├── unit/
│   ├── integration/
│   └── setup.ts
├── .env.example
├── .gitignore
├── docker-compose.yml
├── package.json
├── tsconfig.json
└── README.md
```

**1.7 Create placeholder README.md**

```markdown
# Rekt CEO Backend API

Minimal, secure backend for gasless NFT minting.

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Edit .env with your values

# Start Redis
docker-compose up -d

# Start development server
npm run dev
```

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed system design.

## API Endpoints

- POST /api/auth/nonce - Get nonce for SIWE
- POST /api/auth/verify - Verify SIWE signature
- GET /api/info/pricing/:nftType - Get current pricing
- GET /api/info/user/:address - Get user mint info
- POST /api/mint/initiate - Start minting process
- GET /api/health - Health check

## Environment Variables

See `.env.example` for required configuration.
```

**1.8 Copy contract ABIs**

Copy these files from the main project's `artifacts` folder:
- `artifacts/contracts/MinterContract.sol/MinterContract.json` → `src/abi/MinterContract.json`
- `artifacts/contracts/NFTCollection.sol/NFTCollection.json` → `src/abi/NFTCollection.json`
- `artifacts/contracts/CEOToken.sol/CEOToken.json` → `src/abi/CEOToken.json`

Extract just the ABI array from each (look for the `"abi": [...]` field).

### Validation Criteria
- [ ] `npm install` runs without errors
- [ ] `npm run build` compiles TypeScript successfully
- [ ] `.env.example` exists with all required variables
- [ ] Directory structure matches specification
- [ ] Contract ABIs copied to `src/abi/`
- [ ] `docker-compose up -d` starts Redis successfully

---

## Phase 2: Core Configuration Module

### Objective
Create a centralized configuration module with typed environment variables and validation.

### Tasks

**2.1 Create src/config/index.ts**

```typescript
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
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3001',
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
```

**2.2 Create src/utils/logger.ts**

```typescript
import winston from 'winston';
import { config } from '../config';

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

export const logger = winston.createLogger({
  level: config.logLevel,
  format: logFormat,
  defaultMeta: { service: 'rekt-ceo-backend' },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: config.nodeEnv === 'development' ? consoleFormat : logFormat,
    }),
    // File transports for production
    ...(config.nodeEnv === 'production'
      ? [
          new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
          }),
          new winston.transports.File({
            filename: 'logs/combined.log',
          }),
        ]
      : []),
  ],
});
```

**2.3 Create src/types/index.ts**

```typescript
import { z } from 'zod';

// NFT Types
export type NFTType = 'PFP' | 'MEME';

// Permit signature structure (matches EIP-2612)
export interface PermitSignature {
  owner: string;
  spender: string;
  value: string;
  deadline: number;
  v: number;
  r: string;
  s: string;
}

// Validation schema for permit signature
export const permitSignatureSchema = z.object({
  owner: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  spender: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  value: z.string().regex(/^\d+$/),
  deadline: z.number().int().positive(),
  v: z.number().int().min(27).max(28),
  r: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  s: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
});

// NFT Metadata structure (OpenSea standard)
export interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  external_url?: string;
  attributes?: Array<{
    trait_type: string;
    value: string | number;
  }>;
  created_by: string;
  created_at: number;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Tier info from contract
export interface TierInfo {
  currentSupply: number;
  tierId: number;
  priceUSD: string;
  priceCEO: string;
  remainingInTier: number;
}

// User mint info
export interface UserMintInfo {
  address: string;
  pfp: {
    mintCount: number;
    canMint: boolean;
    maxMint: number;
  };
  meme: {
    mintCount: number;
    canMint: boolean;
    maxMint: number;
  };
}

// Custom error class
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational: boolean = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}
```

### Validation Criteria
- [ ] Config module validates all environment variables
- [ ] Invalid config causes process to exit with error message
- [ ] Logger writes to console in development
- [ ] All types are properly defined
- [ ] No TypeScript compilation errors

---

## Phase 3: Blockchain Service Layer

### Objective
Create services to interact with smart contracts with proper error handling and retry logic.

### Tasks

**3.1 Create src/utils/provider.ts**

```typescript
import { ethers } from 'ethers';
import { config } from '../config';
import { logger } from './logger';

class ProviderManager {
  private providers: ethers.JsonRpcProvider[];
  private currentProviderIndex: number = 0;

  constructor() {
    this.providers = [
      new ethers.JsonRpcProvider(config.rpcUrl),
      ...(config.rpcUrlFallback
        ? [new ethers.JsonRpcProvider(config.rpcUrlFallback)]
        : []),
    ];
  }

  getProvider(): ethers.JsonRpcProvider {
    return this.providers[this.currentProviderIndex];
  }

  async switchProvider(): Promise<void> {
    if (this.providers.length > 1) {
      this.currentProviderIndex = (this.currentProviderIndex + 1) % this.providers.length;
      logger.warn(`Switched to fallback provider (index: ${this.currentProviderIndex})`);
    }
  }

  async executeWithRetry<T>(
    fn: (provider: ethers.JsonRpcProvider) => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const provider = this.getProvider();
        return await fn(provider);
      } catch (error: any) {
        lastError = error;
        logger.warn(`RPC call failed (attempt ${attempt}/${maxRetries}):`, error.message);

        if (attempt < maxRetries) {
          await this.switchProvider();
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
        }
      }
    }

    throw lastError;
  }
}

export const providerManager = new ProviderManager();

// Get backend wallet
export const getBackendWallet = (): ethers.Wallet => {
  const provider = providerManager.getProvider();
  return new ethers.Wallet(config.backendPrivateKey, provider);
};
```

**3.2 Create src/services/contract.service.ts**

```typescript
import { ethers } from 'ethers';
import { config, NFTType } from '../config';
import { providerManager, getBackendWallet } from '../utils/provider';
import { logger } from '../utils/logger';
import { AppError } from '../types';
import { PermitSignature, TierInfo } from '../types';

// Import ABIs
import MinterABI from '../abi/MinterContract.json';
import NFTCollectionABI from '../abi/NFTCollection.json';
import CEOTokenABI from '../abi/CEOToken.json';

class ContractService {
  private minterContract: ethers.Contract;
  private pfpContract: ethers.Contract;
  private memeContract: ethers.Contract;
  private ceoToken: ethers.Contract;

  constructor() {
    const provider = providerManager.getProvider();

    this.minterContract = new ethers.Contract(
      config.minterContractAddress,
      MinterABI,
      provider
    );

    this.pfpContract = new ethers.Contract(
      config.pfpCollectionAddress,
      NFTCollectionABI,
      provider
    );

    this.memeContract = new ethers.Contract(
      config.memeCollectionAddress,
      NFTCollectionABI,
      provider
    );

    this.ceoToken = new ethers.Contract(
      config.ceoTokenAddress,
      CEOTokenABI,
      provider
    );
  }

  /**
   * Get current tier information for NFT type
   */
  async getCurrentTierInfo(nftType: 'PFP' | 'MEME'): Promise<TierInfo> {
    try {
      const nftTypeEnum = nftType === 'PFP' ? NFTType.PFP : NFTType.MEME;

      const result = await providerManager.executeWithRetry(async () => {
        return await this.minterContract.getCurrentTierInfo(nftTypeEnum);
      });

      return {
        currentSupply: Number(result.currentSupply),
        tierId: Number(result.tierId),
        priceUSD: result.priceUSD.toString(),
        priceCEO: result.priceCEO.toString(),
        remainingInTier: Number(result.remainingInTier),
      };
    } catch (error: any) {
      logger.error('Failed to get tier info:', error);
      throw new AppError(500, `Failed to fetch ${nftType} tier information`);
    }
  }

  /**
   * Check if user can mint more NFTs
   */
  async canUserMint(address: string, nftType: 'PFP' | 'MEME'): Promise<boolean> {
    try {
      const nftTypeEnum = nftType === 'PFP' ? NFTType.PFP : NFTType.MEME;

      return await providerManager.executeWithRetry(async () => {
        return await this.minterContract.canUserMint(address, nftTypeEnum);
      });
    } catch (error: any) {
      logger.error('Failed to check user mint eligibility:', error);
      throw new AppError(500, 'Failed to check mint eligibility');
    }
  }

  /**
   * Get user's mint count
   */
  async getUserMintCount(address: string, nftType: 'PFP' | 'MEME'): Promise<number> {
    try {
      const nftTypeEnum = nftType === 'PFP' ? NFTType.PFP : NFTType.MEME;

      const count = await providerManager.executeWithRetry(async () => {
        return await this.minterContract.getUserMintCount(address, nftTypeEnum);
      });

      return Number(count);
    } catch (error: any) {
      logger.error('Failed to get user mint count:', error);
      throw new AppError(500, 'Failed to fetch mint count');
    }
  }

  /**
   * Get CEO token price from DEX
   */
  async getCEOPrice(): Promise<string> {
    try {
      const price = await providerManager.executeWithRetry(async () => {
        return await this.minterContract.queryCEOPriceFromDEX();
      });

      return price.toString();
    } catch (error: any) {
      logger.error('Failed to get CEO price:', error);
      throw new AppError(500, 'Failed to fetch CEO token price');
    }
  }

  /**
   * Execute mint with permit signature
   */
  async mintNFTWithPermit(
    nftType: 'PFP' | 'MEME',
    metadataURI: string,
    permitSignature: PermitSignature
  ): Promise<{ txHash: string; tokenId: number }> {
    try {
      const nftTypeEnum = nftType === 'PFP' ? NFTType.PFP : NFTType.MEME;
      const wallet = getBackendWallet();
      const contractWithSigner = this.minterContract.connect(wallet);

      logger.info('Executing mintNFTWithPermit', {
        nftType,
        metadataURI,
        owner: permitSignature.owner,
      });

      // Estimate gas
      const gasEstimate = await contractWithSigner.mintNFTWithPermit.estimateGas(
        nftTypeEnum,
        metadataURI,
        permitSignature
      );

      // Add 20% buffer to gas estimate
      const gasLimit = (gasEstimate * 120n) / 100n;

      // Execute transaction
      const tx = await contractWithSigner.mintNFTWithPermit(
        nftTypeEnum,
        metadataURI,
        permitSignature,
        { gasLimit }
      );

      logger.info('Transaction submitted', { txHash: tx.hash });

      // Wait for confirmation
      const receipt = await tx.wait(2); // Wait for 2 confirmations

      if (!receipt || receipt.status === 0) {
        throw new Error('Transaction failed');
      }

      // Parse events to get tokenId
      const nftPurchasedEvent = receipt.logs
        .map((log: any) => {
          try {
            return this.minterContract.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((event: any) => event && event.name === 'NFTPurchased');

      if (!nftPurchasedEvent) {
        throw new Error('NFTPurchased event not found in transaction logs');
      }

      const tokenId = Number(nftPurchasedEvent.args.tokenId);

      logger.info('NFT minted successfully', {
        txHash: receipt.hash,
        tokenId,
        user: permitSignature.owner,
      });

      return {
        txHash: receipt.hash,
        tokenId,
      };
    } catch (error: any) {
      logger.error('Failed to mint NFT:', error);

      // Parse contract revert reasons
      if (error.message.includes('User mint limit reached')) {
        throw new AppError(403, 'Mint limit reached for this NFT type');
      } else if (error.message.includes('All tiers exhausted')) {
        throw new AppError(400, 'Collection is sold out');
      } else if (error.message.includes('insufficient funds')) {
        throw new AppError(400, 'Insufficient CEO tokens in wallet');
      } else if (error.message.includes('permit')) {
        throw new AppError(400, 'Invalid permit signature');
      }

      throw new AppError(500, 'Failed to mint NFT');
    }
  }

  /**
   * Check backend wallet balance
   */
  async checkBackendWalletBalance(): Promise<{ address: string; balance: string; balanceETH: string }> {
    try {
      const wallet = getBackendWallet();
      const balance = await wallet.provider!.getBalance(wallet.address);

      return {
        address: wallet.address,
        balance: balance.toString(),
        balanceETH: ethers.formatEther(balance),
      };
    } catch (error: any) {
      logger.error('Failed to check backend wallet balance:', error);
      throw new AppError(500, 'Failed to check wallet balance');
    }
  }
}

export const contractService = new ContractService();
```

### Validation Criteria
- [ ] Can call `getCurrentTierInfo()` without errors
- [ ] Can check user mint eligibility
- [ ] Provider automatically retries on failure
- [ ] Backend wallet can be initialized
- [ ] Contract ABI is loaded correctly

---

## Phase 4: IPFS Integration

### Objective
Implement image and metadata upload to IPFS via Pinata with validation.

### Tasks

**4.1 Create src/utils/image-validator.ts**

```typescript
import sharp from 'sharp';
import { AppError } from '../types';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MIN_DIMENSION = 500;
const MAX_DIMENSION = 4096;
const ALLOWED_FORMATS = ['png', 'jpg', 'jpeg', 'gif', 'webp'];

export async function validateImage(base64Data: string): Promise<Buffer> {
  // Remove data URL prefix if present
  const base64String = base64Data.replace(/^data:image\/\w+;base64,/, '');

  // Decode base64
  const buffer = Buffer.from(base64String, 'base64');

  // Check file size
  if (buffer.length > MAX_FILE_SIZE) {
    throw new AppError(400, `Image too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  }

  // Get image metadata
  let metadata;
  try {
    metadata = await sharp(buffer).metadata();
  } catch (error) {
    throw new AppError(400, 'Invalid image file');
  }

  // Check format
  if (!metadata.format || !ALLOWED_FORMATS.includes(metadata.format)) {
    throw new AppError(400, `Invalid image format. Allowed: ${ALLOWED_FORMATS.join(', ')}`);
  }

  // Check dimensions
  if (!metadata.width || !metadata.height) {
    throw new AppError(400, 'Could not determine image dimensions');
  }

  if (metadata.width < MIN_DIMENSION || metadata.height < MIN_DIMENSION) {
    throw new AppError(400, `Image too small. Minimum dimensions: ${MIN_DIMENSION}x${MIN_DIMENSION}px`);
  }

  if (metadata.width > MAX_DIMENSION || metadata.height > MAX_DIMENSION) {
    throw new AppError(400, `Image too large. Maximum dimensions: ${MAX_DIMENSION}x${MAX_DIMENSION}px`);
  }

  return buffer;
}
```

**4.2 Create src/services/ipfs.service.ts**

```typescript
import { PinataSDK } from 'pinata-web3';
import { config } from '../config';
import { logger } from '../utils/logger';
import { AppError, NFTMetadata } from '../types';
import { validateImage } from '../utils/image-validator';

class IPFSService {
  private pinata: PinataSDK;

  constructor() {
    this.pinata = new PinataSDK({
      pinataJwt: config.pinataJwt,
      pinataGateway: config.pinataGateway.replace('https://', ''),
    });
  }

  /**
   * Upload image to IPFS
   */
  async uploadImage(imageData: string, filename: string): Promise<string> {
    try {
      logger.info('Validating image...');
      const imageBuffer = await validateImage(imageData);

      logger.info('Uploading image to IPFS...', { size: imageBuffer.length });

      // Create file from buffer
      const file = new File([imageBuffer], filename, { type: 'image/png' });

      // Upload to Pinata
      const upload = await this.pinata.upload.file(file);

      const ipfsHash = upload.IpfsHash;
      const uri = `ipfs://${ipfsHash}`;

      logger.info('Image uploaded to IPFS', { uri, hash: ipfsHash });

      return uri;
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Failed to upload image to IPFS:', error);
      throw new AppError(500, 'Failed to upload image to IPFS');
    }
  }

  /**
   * Upload metadata JSON to IPFS
   */
  async uploadMetadata(metadata: NFTMetadata): Promise<string> {
    try {
      logger.info('Uploading metadata to IPFS...', { name: metadata.name });

      // Convert metadata to JSON string
      const jsonString = JSON.stringify(metadata, null, 2);

      // Upload to Pinata
      const upload = await this.pinata.upload.json(metadata);

      const ipfsHash = upload.IpfsHash;
      const uri = `ipfs://${ipfsHash}`;

      logger.info('Metadata uploaded to IPFS', { uri, hash: ipfsHash });

      return uri;
    } catch (error: any) {
      logger.error('Failed to upload metadata to IPFS:', error);
      throw new AppError(500, 'Failed to upload metadata to IPFS');
    }
  }

  /**
   * Generate NFT metadata
   */
  generateMetadata(
    nftType: 'PFP' | 'MEME',
    tokenId: number,
    imageUri: string,
    creatorAddress: string
  ): NFTMetadata {
    const collectionName = nftType === 'PFP' ? 'Rekt CEO PFP' : 'Rekt CEO Meme';

    return {
      name: `${collectionName} #${tokenId}`,
      description: `Part of the Rekt CEO ${nftType} collection`,
      image: imageUri,
      external_url: 'https://rektceo.club',
      attributes: [
        {
          trait_type: 'Type',
          value: nftType,
        },
        {
          trait_type: 'Token ID',
          value: tokenId,
        },
      ],
      created_by: creatorAddress,
      created_at: Math.floor(Date.now() / 1000),
    };
  }
}

export const ipfsService = new IPFSService();
```

### Validation Criteria
- [ ] Can validate images correctly
- [ ] Rejects oversized images
- [ ] Rejects invalid formats
- [ ] Can upload to IPFS and get URI
- [ ] Metadata follows OpenSea standard

---

## Phase 5: SIWE Authentication

### Objective
Implement Sign-In With Ethereum (SIWE) for wallet-based authentication with JWT tokens.

### Tasks

**5.1 Create src/utils/jwt.ts**

```typescript
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AppError } from '../types';

export interface JWTPayload {
  address: string;
  iat?: number;
  exp?: number;
}

export function generateToken(address: string): string {
  return jwt.sign({ address }, config.jwtSecret, {
    expiresIn: config.jwtExpiry,
  });
}

export function verifyToken(token: string): JWTPayload {
  try {
    const payload = jwt.verify(token, config.jwtSecret) as JWTPayload;
    return payload;
  } catch (error) {
    throw new AppError(401, 'Invalid or expired token');
  }
}
```

**5.2 Create src/services/auth.service.ts**

```typescript
import { SiweMessage } from 'siwe';
import Redis from 'ioredis';
import { ethers } from 'ethers';
import { config } from '../config';
import { logger } from '../utils/logger';
import { AppError } from '../types';
import { generateToken } from '../utils/jwt';

class AuthService {
  private redis: Redis;

  constructor() {
    this.redis = new Redis(config.redisUrl);
  }

  /**
   * Generate nonce for SIWE
   */
  async generateNonce(address: string): Promise<string> {
    // Validate address
    if (!ethers.isAddress(address)) {
      throw new AppError(400, 'Invalid Ethereum address');
    }

    // Generate random nonce
    const nonce = ethers.hexlify(ethers.randomBytes(16));

    // Store in Redis with 5 minute expiry
    const key = `nonce:${address.toLowerCase()}`;
    await this.redis.setex(key, 300, nonce);

    logger.info('Generated nonce', { address, nonce });

    return nonce;
  }

  /**
   * Verify SIWE message and signature
   */
  async verifySignature(message: string, signature: string): Promise<{ address: string; token: string }> {
    try {
      // Parse SIWE message
      const siweMessage = new SiweMessage(message);

      // Verify signature
      const fields = await siweMessage.verify({ signature });

      if (!fields.success) {
        throw new AppError(401, 'Invalid signature');
      }

      const address = siweMessage.address.toLowerCase();

      // Check nonce
      const key = `nonce:${address}`;
      const storedNonce = await this.redis.get(key);

      if (!storedNonce || storedNonce !== siweMessage.nonce) {
        throw new AppError(401, 'Invalid or expired nonce');
      }

      // Delete nonce (single-use)
      await this.redis.del(key);

      // Generate JWT token
      const token = generateToken(address);

      logger.info('User authenticated', { address });

      return { address, token };
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Failed to verify signature:', error);
      throw new AppError(401, 'Failed to verify signature');
    }
  }
}

export const authService = new AuthService();
```

**5.3 Create src/middleware/auth.ts**

```typescript
import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { AppError } from '../types';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        address: string;
      };
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError(401, 'Missing or invalid authorization header');
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const payload = verifyToken(token);

    // Attach user to request
    req.user = { address: payload.address };

    next();
  } catch (error) {
    next(error);
  }
}
```

### Validation Criteria
- [ ] Can generate nonce for address
- [ ] Nonce expires after 5 minutes
- [ ] Can verify valid SIWE signature
- [ ] Rejects invalid signatures
- [ ] JWT token is generated correctly
- [ ] Auth middleware extracts user from token

---

## Phase 6: Minting Service with Simple Queue

### Objective
Create a minting service with in-memory queue for sequential processing.

### Tasks

**6.1 Create src/services/mint-queue.service.ts**

```typescript
import { logger } from '../utils/logger';

interface MintTask {
  id: string;
  userAddress: string;
  nftType: 'PFP' | 'MEME';
  imageData: string;
  permitSignature: any;
  resolve: (result: any) => void;
  reject: (error: any) => void;
}

class MintQueueService {
  private queue: MintTask[] = [];
  private processing: boolean = false;
  private userQueues: Map<string, number> = new Map(); // Track concurrent requests per user

  /**
   * Add mint task to queue
   */
  async addToQueue(task: Omit<MintTask, 'resolve' | 'reject'>): Promise<any> {
    return new Promise((resolve, reject) => {
      // Check if user already has a pending mint
      const userKey = `${task.userAddress}-${task.nftType}`;
      const userQueueCount = this.userQueues.get(userKey) || 0;

      if (userQueueCount > 0) {
        reject(new Error('You already have a pending mint for this NFT type'));
        return;
      }

      // Add to user queue counter
      this.userQueues.set(userKey, userQueueCount + 1);

      // Add to queue
      this.queue.push({ ...task, resolve, reject });

      logger.info('Task added to queue', {
        id: task.id,
        user: task.userAddress,
        nftType: task.nftType,
        queueLength: this.queue.length,
      });

      // Start processing if not already processing
      if (!this.processing) {
        this.processQueue();
      }
    });
  }

  /**
   * Process queue sequentially
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const task = this.queue.shift()!;
      const userKey = `${task.userAddress}-${task.nftType}`;

      try {
        logger.info('Processing mint task', {
          id: task.id,
          user: task.userAddress,
          nftType: task.nftType,
        });

        // Import here to avoid circular dependency
        const { mintService } = await import('./mint.service');
        const result = await mintService.processMint(task);

        // Decrement user queue counter
        const count = this.userQueues.get(userKey) || 1;
        if (count <= 1) {
          this.userQueues.delete(userKey);
        } else {
          this.userQueues.set(userKey, count - 1);
        }

        task.resolve(result);
      } catch (error: any) {
        logger.error('Mint task failed', {
          id: task.id,
          user: task.userAddress,
          error: error.message,
        });

        // Decrement user queue counter
        const count = this.userQueues.get(userKey) || 1;
        if (count <= 1) {
          this.userQueues.delete(userKey);
        } else {
          this.userQueues.set(userKey, count - 1);
        }

        task.reject(error);
      }

      // Small delay between tasks
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    this.processing = false;
  }

  /**
   * Get queue status
   */
  getStatus() {
    return {
      queueLength: this.queue.length,
      processing: this.processing,
      userQueues: Array.from(this.userQueues.entries()),
    };
  }
}

export const mintQueueService = new MintQueueService();
```

**6.2 Create src/services/mint.service.ts**

```typescript
import { ethers } from 'ethers';
import { config } from '../config';
import { logger } from '../utils/logger';
import { AppError, PermitSignature } from '../types';
import { contractService } from './contract.service';
import { ipfsService } from './ipfs.service';

class MintService {
  /**
   * Process mint task
   */
  async processMint(task: {
    id: string;
    userAddress: string;
    nftType: 'PFP' | 'MEME';
    imageData: string;
    permitSignature: PermitSignature;
  }): Promise<{
    success: boolean;
    txHash: string;
    tokenId: number;
    imageURI: string;
    metadataURI: string;
  }> {
    const { userAddress, nftType, imageData, permitSignature } = task;

    // Step 1: Validate user eligibility
    logger.info('Checking user eligibility', { user: userAddress, nftType });
    const canMint = await contractService.canUserMint(userAddress, nftType);

    if (!canMint) {
      throw new AppError(403, `Mint limit reached for ${nftType}`);
    }

    // Step 2: Validate permit signature
    this.validatePermitSignature(permitSignature, userAddress);

    // Step 3: Upload image to IPFS
    logger.info('Uploading image to IPFS', { user: userAddress });
    const imageURI = await ipfsService.uploadImage(
      imageData,
      `${nftType.toLowerCase()}-${Date.now()}.png`
    );

    // Step 4: Get next token ID (approximate)
    const tierInfo = await contractService.getCurrentTierInfo(nftType);
    const predictedTokenId = tierInfo.currentSupply + 1;

    // Step 5: Generate and upload metadata
    logger.info('Generating metadata', { user: userAddress, tokenId: predictedTokenId });
    const metadata = ipfsService.generateMetadata(
      nftType,
      predictedTokenId,
      imageURI,
      userAddress
    );

    const metadataURI = await ipfsService.uploadMetadata(metadata);

    // Step 6: Execute mint transaction
    logger.info('Executing mint transaction', { user: userAddress, nftType });
    const { txHash, tokenId } = await contractService.mintNFTWithPermit(
      nftType,
      metadataURI,
      permitSignature
    );

    logger.info('Mint completed successfully', {
      user: userAddress,
      nftType,
      tokenId,
      txHash,
    });

    return {
      success: true,
      txHash,
      tokenId,
      imageURI,
      metadataURI,
    };
  }

  /**
   * Validate permit signature
   */
  private validatePermitSignature(permit: PermitSignature, userAddress: string): void {
    // Check owner matches authenticated user
    if (permit.owner.toLowerCase() !== userAddress.toLowerCase()) {
      throw new AppError(400, 'Permit owner must match authenticated user');
    }

    // Check spender is minter contract
    if (permit.spender.toLowerCase() !== config.minterContractAddress.toLowerCase()) {
      throw new AppError(400, 'Permit spender must be the minter contract');
    }

    // Check deadline hasn't passed
    const now = Math.floor(Date.now() / 1000);
    if (permit.deadline < now) {
      throw new AppError(400, 'Permit signature has expired');
    }

    // Check value is a valid number
    try {
      ethers.getBigInt(permit.value);
    } catch {
      throw new AppError(400, 'Invalid permit value');
    }

    // Check v is valid (27 or 28)
    if (permit.v !== 27 && permit.v !== 28) {
      throw new AppError(400, 'Invalid permit signature (v component)');
    }

    // Check r and s are 32 bytes
    if (!/^0x[a-fA-F0-9]{64}$/.test(permit.r) || !/^0x[a-fA-F0-9]{64}$/.test(permit.s)) {
      throw new AppError(400, 'Invalid permit signature (r/s components)');
    }
  }
}

export const mintService = new MintService();
```

### Validation Criteria
- [ ] Can add tasks to queue
- [ ] Processes tasks sequentially
- [ ] Prevents duplicate mints for same user
- [ ] Validates permit signature correctly
- [ ] Uploads to IPFS before minting
- [ ] Returns transaction hash and token ID

---

*(Continue with Phase 7-10 in similar format... Due to length, I'll provide the remaining phases in condensed form)*

## Phase 7: REST API Endpoints

Create routes and controllers for:
- `POST /api/auth/nonce` - Generate nonce
- `POST /api/auth/verify` - Verify SIWE signature
- `GET /api/info/pricing/:nftType` - Get tier pricing
- `GET /api/info/user/:address` - Get user mint info
- `GET /api/info/ceo-price` - Get CEO token price
- `POST /api/mint/initiate` - Start mint (protected)
- `GET /api/health` - Health check

Files to create:
- `src/routes/auth.routes.ts`
- `src/routes/info.routes.ts`
- `src/routes/mint.routes.ts`
- `src/routes/health.routes.ts`
- `src/controllers/auth.controller.ts`
- `src/controllers/info.controller.ts`
- `src/controllers/mint.controller.ts`
- `src/index.ts` (main Express app)

## Phase 8: Security & Rate Limiting

Implement:
- Helmet for security headers
- CORS configuration
- Rate limiting with Redis
- Input validation with Zod
- Error handling middleware

Files:
- `src/middleware/security.ts`
- `src/middleware/rate-limit.ts`
- `src/middleware/error-handler.ts`
- `src/middleware/validation.ts`

## Phase 9: Testing

Create tests for:
- Auth service (SIWE flow)
- Contract service (mock RPC)
- IPFS service (mock Pinata)
- API endpoints (supertest)

Files:
- `tests/unit/auth.service.test.ts`
- `tests/unit/contract.service.test.ts`
- `tests/integration/mint-flow.test.ts`
- `tests/setup.ts`

## Phase 10: Deployment

Create:
- `Dockerfile` for containerization
- `.dockerignore`
- Deployment documentation
- Environment setup guide
- Monitoring setup

Files:
- `Dockerfile`
- `docker-compose.prod.yml`
- `DEPLOYMENT.md`

---

## Complete Example: Main Entry Point (src/index.ts)

```typescript
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { config } from './config';
import { logger } from './utils/logger';
import authRoutes from './routes/auth.routes';
import infoRoutes from './routes/info.routes';
import mintRoutes from './routes/mint.routes';
import healthRoutes from './routes/health.routes';
import { errorHandler } from './middleware/error-handler';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({ origin: config.corsOrigin, credentials: true }));

// Body parsing
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/info', infoRoutes);
app.use('/api/mint', mintRoutes);
app.use('/api/health', healthRoutes);

// Error handling (must be last)
app.use(errorHandler);

// Start server
const PORT = config.port;
app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`Environment: ${config.nodeEnv}`);
  logger.info(`Chain ID: ${config.chainId}`);
});

export default app;
```

---

## Implementation Checklist

Use this checklist to track progress:

### Phase 1: Project Setup
- [ ] package.json with all dependencies
- [ ] TypeScript configuration
- [ ] Environment variables setup
- [ ] Directory structure created
- [ ] Contract ABIs copied
- [ ] Redis running locally

### Phase 2: Configuration
- [ ] Config module with validation
- [ ] Logger setup
- [ ] Type definitions
- [ ] Error classes

### Phase 3: Blockchain
- [ ] Provider with retry logic
- [ ] Contract service with all functions
- [ ] Error handling for contract calls

### Phase 4: IPFS
- [ ] Image validation
- [ ] Pinata integration
- [ ] Metadata generation

### Phase 5: Authentication
- [ ] SIWE implementation
- [ ] JWT generation/verification
- [ ] Auth middleware
- [ ] Nonce management

### Phase 6: Minting
- [ ] Simple queue service
- [ ] Mint processing logic
- [ ] Permit validation
- [ ] Complete mint flow

### Phase 7: API
- [ ] All route files
- [ ] All controllers
- [ ] Main Express app
- [ ] Response formatting

### Phase 8: Security
- [ ] Helmet configuration
- [ ] CORS setup
- [ ] Rate limiting
- [ ] Input validation
- [ ] Error handling

### Phase 9: Testing
- [ ] Unit tests
- [ ] Integration tests
- [ ] E2E tests
- [ ] Test coverage > 80%

### Phase 10: Deployment
- [ ] Dockerfile
- [ ] Docker Compose
- [ ] Deployment docs
- [ ] Monitoring setup

---

## Quick Command Reference

```bash
# Development
npm run dev              # Start with hot reload
npm run build            # Compile TypeScript
npm start                # Run production build

# Testing
npm test                 # Run all tests
npm run test:watch       # Watch mode

# Docker
docker-compose up -d     # Start Redis
docker-compose down      # Stop all services

# Linting
npm run lint             # Check code style
npm run format           # Format code
```

---

## Troubleshooting Common Issues

**Issue: "Cannot find module '@/abi/...'"**
- Solution: Ensure contract ABIs are copied to `src/abi/` directory

**Issue: "Invalid configuration" on startup**
- Solution: Check all environment variables in `.env` match `.env.example`

**Issue: "RPC call failed"**
- Solution: Verify RPC_URL is correct and Alchemy API key is valid

**Issue: "Failed to upload to IPFS"**
- Solution: Check PINATA_JWT is correct and account has sufficient storage

**Issue: "Transaction reverted"**
- Solution: Ensure backend wallet has APPROVER_ROLE and sufficient ETH for gas

---

## Next Steps After Implementation

1. Deploy contracts to testnet
2. Grant APPROVER_ROLE to backend wallet
3. Test complete flow on testnet
4. Set up monitoring and alerts
5. Deploy to production
6. Document API for frontend team

---

This implementation guide provides all the code and context needed to build the backend. Each phase builds on the previous one, and all validation criteria should be met before moving to the next phase.

