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

