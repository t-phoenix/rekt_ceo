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

  constructor() {
    const provider = providerManager.getProvider();

    this.minterContract = new ethers.Contract(
      config.minterContractAddress,
      MinterABI,
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
      const contractWithSigner = this.minterContract.connect(wallet) as any;

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
