import { SiweMessage } from 'siwe';
import { ethers } from 'ethers';
import { logger } from '../utils/logger';
import { AppError } from '../types';
import { generateToken } from '../utils/jwt';
import { redisManager } from '../utils/redis';

class AuthService {
  /**
   * Get Redis client (lazy initialization)
   */
  private async getRedis() {
    const redis = await redisManager.getClient();
    if (!redis) {
      throw new AppError(503, 'Redis service unavailable. Please try again later.');
    }
    return redis;
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
    const redis = await this.getRedis();
    const key = `nonce:${address.toLowerCase()}`;
    await redis.setex(key, 300, nonce);

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
      const redis = await this.getRedis();
      const key = `nonce:${address}`;
      const storedNonce = await redis.get(key);

      if (!storedNonce || storedNonce !== siweMessage.nonce) {
        throw new AppError(401, 'Invalid or expired nonce');
      }

      // Delete nonce (single-use)
      await redis.del(key);

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

