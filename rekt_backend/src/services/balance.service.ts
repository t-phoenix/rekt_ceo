import { ethers } from 'ethers';
import { config } from '../config';
import { providerManager } from '../utils/provider';
import { logger } from '../utils/logger';
import { AppError } from '../types';
import CEOTokenABI from '../abi/CEOToken.json';

class BalanceService {
  private ceoToken: ethers.Contract;

  constructor() {
    const provider = providerManager.getProvider();
    this.ceoToken = new ethers.Contract(config.ceoTokenAddress, CEOTokenABI, provider);
  }

  /**
   * Get CEO token balance for an address
   */
  async getBalance(address: string): Promise<{ balance: string; balanceRaw: string; decimals: number }> {
    try {
      const [balanceRaw, decimals] = await Promise.all([
        providerManager.executeWithRetry(() => this.ceoToken.balanceOf(address)),
        providerManager.executeWithRetry(() => this.ceoToken.decimals()),
      ]);

      return {
        balance: ethers.formatUnits(balanceRaw, decimals),
        balanceRaw: balanceRaw.toString(),
        decimals: Number(decimals),
      };
    } catch (error) {
      logger.error('Failed to get CEO balance:', error);
      throw new AppError(500, 'Failed to fetch CEO token balance');
    }
  }

  /**
   * Get raw balance for an address
   */
  async getBalanceRaw(address: string): Promise<bigint> {
    try {
      const balance = await providerManager.executeWithRetry(() =>
        this.ceoToken.balanceOf(address)
      );
      return BigInt(balance);
    } catch (error) {
      logger.error('Failed to get CEO balance:', error);
      throw new AppError(500, 'Failed to fetch CEO token balance');
    }
  }

  /**
   * Validate balance and permit for minting
   * Checks: balance >= nftPrice, permitValue >= nftPrice, permitValue <= balance
   */
  validateMintRequirements(
    balanceRaw: bigint,
    permitValueRaw: string,
    nftPriceRaw: string
  ): { valid: boolean; error?: string } {
    const balance = balanceRaw;
    const permitValue = BigInt(permitValueRaw);
    const nftPrice = BigInt(nftPriceRaw);

    if (balance < nftPrice) {
      return { valid: false, error: 'Insufficient CEO token balance for NFT price' };
    }

    if (permitValue < nftPrice) {
      return { valid: false, error: 'Permit approval amount is less than NFT price' };
    }

    if (permitValue > balance) {
      return { valid: false, error: 'Permit approval exceeds token balance' };
    }

    return { valid: true };
  }
}

export const balanceService = new BalanceService();

