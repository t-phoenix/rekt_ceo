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

