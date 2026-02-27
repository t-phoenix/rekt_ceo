import { ethers } from 'ethers';
import { config, NFTType } from '../config';
import { providerManager, getBackendWallet } from '../utils/provider';
import { logger } from '../utils/logger';
import { AppError } from '../types';
import { PermitSignature, TierInfo } from '../types';

// Import ABIs
import MinterABI from '../abi/MinterContract.json';

// ERC20Permit ABI for nonces function
const ERC20PermitABI = [
  'function nonces(address owner) view returns (uint256)',
];

class ContractService {
  private minterContract: ethers.Contract;
  private ceoTokenContract: ethers.Contract;

  constructor() {
    const provider = providerManager.getProvider();

    this.minterContract = new ethers.Contract(
      config.minterContractAddress,
      MinterABI,
      provider
    );

    this.ceoTokenContract = new ethers.Contract(
      config.ceoTokenAddress,
      ERC20PermitABI,
      provider
    );
  }

  /**
   * Get current tier information for NFT type
   */
  async getCurrentTierInfo(nftType: 'PFP' | 'MEME'): Promise<TierInfo> {
    try {
      const nftTypeEnum = nftType === 'PFP' ? NFTType.PFP : NFTType.MEME;

      // Fetch tier info and decimals in parallel
      const [result, usdcDecimals, ceoDecimals] = await Promise.all([
        providerManager.executeWithRetry(async () => {
          return await this.minterContract.getCurrentTierInfo(nftTypeEnum);
        }),
        this.getUSDCDecimals(),
        this.getCEODecimals(),
      ]);

      return {
        currentSupply: Number(result.currentSupply),
        tierId: Number(result.tierId),
        priceUSD: ethers.formatUnits(result.priceUSD, usdcDecimals),
        priceCEO: ethers.formatUnits(result.priceCEO, ceoDecimals),
        priceCEORaw: result.priceCEO.toString(),
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
   * Get CEO token price from DEX (raw value)
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
   * Get USDC decimals from the minter contract
   */
  async getUSDCDecimals(): Promise<number> {
    try {
      const decimals = await providerManager.executeWithRetry(async () => {
        return await this.minterContract.usdcDecimals();
      });

      return Number(decimals);
    } catch (error: any) {
      logger.error('Failed to get USDC decimals:', error);
      throw new AppError(500, 'Failed to fetch USDC decimals');
    }
  }

  /**
   * Get CEO token decimals from the minter contract
   */
  async getCEODecimals(): Promise<number> {
    try {
      const decimals = await providerManager.executeWithRetry(async () => {
        return await this.minterContract.ceoDecimals();
      });

      return Number(decimals);
    } catch (error: any) {
      logger.error('Failed to get CEO decimals:', error);
      throw new AppError(500, 'Failed to fetch CEO token decimals');
    }
  }

  /**
   * Get permit nonce for an address from the CEO token contract
   */
  async getPermitNonce(address: string): Promise<bigint> {
    try {
      const nonce = await providerManager.executeWithRetry(async () => {
        return await this.ceoTokenContract.nonces(address);
      });

      return BigInt(nonce);
    } catch (error: any) {
      logger.error('Failed to get permit nonce:', error);
      throw new AppError(500, 'Failed to fetch permit nonce');
    }
  }

  /**
   * Execute mint with permit signature — returns real tokenId from event
   * Uses a placeholder metadataURI so the true tokenId can be obtained
   * before IPFS upload. Call setNFTTokenURI() afterwards.
   */
  async mintNFTWithPermit(
    nftType: 'PFP' | 'MEME',
    metadataURI: string,
    permitSignature: PermitSignature
  ): Promise<{ txHash: string; tokenId: number }> {
    const TX_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes — prevents queue deadlock

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

      // Wait for confirmation with timeout to prevent queue from freezing indefinitely
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Transaction ${tx.hash} timed out after 5 minutes in mempool`)),
          TX_TIMEOUT_MS
        )
      );

      const receipt = await Promise.race([tx.wait(2), timeoutPromise]);

      if (!receipt || receipt.status === 0) {
        throw new Error('Transaction failed on-chain (reverted)');
      }

      // Parse events to get the real tokenId assigned by the contract
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
      } else if (error.message.includes('timed out')) {
        throw new AppError(504, error.message);
      }

      throw new AppError(500, 'Failed to mint NFT');
    }
  }

  /**
   * Set the final metadata URI on a minted NFT using the new setNFTTokenURI contract function.
   * Called after IPFS upload to fix the correct token ID in the metadata.
   */
  async setNFTTokenURI(
    nftType: 'PFP' | 'MEME',
    tokenId: number,
    metadataURI: string
  ): Promise<{ txHash: string }> {
    const TX_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes

    try {
      const nftTypeEnum = nftType === 'PFP' ? NFTType.PFP : NFTType.MEME;
      const wallet = getBackendWallet();
      const contractWithSigner = this.minterContract.connect(wallet) as any;

      logger.info('Setting NFT token URI', { nftType, tokenId, metadataURI });

      const gasEstimate = await contractWithSigner.setNFTTokenURI.estimateGas(
        nftTypeEnum,
        tokenId,
        metadataURI
      );
      const gasLimit = (gasEstimate * 120n) / 100n;

      const tx = await contractWithSigner.setNFTTokenURI(
        nftTypeEnum,
        tokenId,
        metadataURI,
        { gasLimit }
      );

      logger.info('setNFTTokenURI transaction submitted', { txHash: tx.hash });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`setNFTTokenURI tx ${tx.hash} timed out`)),
          TX_TIMEOUT_MS
        )
      );

      const receipt = await Promise.race([tx.wait(1), timeoutPromise]);

      if (!receipt || receipt.status === 0) {
        throw new Error('setNFTTokenURI transaction reverted');
      }

      logger.info('NFT token URI updated successfully', { tokenId, metadataURI });

      return { txHash: receipt.hash };
    } catch (error: any) {
      logger.error('Failed to set NFT token URI:', error);
      throw new AppError(500, `Failed to update NFT metadata URI: ${error.message}`);
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
