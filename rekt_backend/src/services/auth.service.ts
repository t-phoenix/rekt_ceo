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

