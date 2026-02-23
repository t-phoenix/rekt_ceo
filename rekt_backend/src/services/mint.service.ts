import { ethers } from 'ethers';
import { config } from '../config';
import { logger } from '../utils/logger';
import { AppError, PermitSignature } from '../types';
import { contractService } from './contract.service';
import { ipfsService } from './ipfs.service';
import { balanceService } from './balance.service';

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
    attributes?: Record<string, string | number> | Array<{ trait_type: string; value: string | number }>;
  }): Promise<{
    success: boolean;
    txHash: string;
    tokenId: number;
    imageURI: string;
    metadataURI: string;
  }> {
    const { userAddress, nftType, imageData, permitSignature } = task;

    // Step 1: Fetch eligibility, tier info, and user balance in parallel
    logger.info('Validating mint requirements', { user: userAddress, nftType });
    const [canMint, tierInfo, userBalance] = await Promise.all([
      contractService.canUserMint(userAddress, nftType),
      contractService.getCurrentTierInfo(nftType),
      balanceService.getBalanceRaw(userAddress),
    ]);

    if (!canMint) {
      throw new AppError(403, `Mint limit reached for ${nftType}`);
    }

    // Step 2: Validate balance and permit requirements
    const validation = balanceService.validateMintRequirements(
      userBalance,
      permitSignature.value,
      tierInfo.priceCEORaw
    );
    if (!validation.valid) {
      throw new AppError(400, validation.error!);
    }

    // Step 3: Validate permit signature
    this.validatePermitSignature(permitSignature, userAddress);

    // Step 4: Get next token ID (approximate, reusing tier info)
    const predictedTokenId = tierInfo.currentSupply + 1;
    const collectionName = nftType === 'PFP' ? 'Rekt CEO PFP' : 'Rekt CEO Meme';
    const baseFileName = `${collectionName} #${predictedTokenId}`;

    // Step 5: Upload image to IPFS
    logger.info('Uploading image to IPFS', { user: userAddress, fileName: baseFileName });
    const imageURI = await ipfsService.uploadImage(
      imageData,
      `${baseFileName}.png`
    );

    // Step 6: Generate and upload metadata
    logger.info('Generating metadata', { user: userAddress, tokenId: predictedTokenId });
    const metadata = ipfsService.generateMetadata(
      nftType,
      predictedTokenId,
      imageURI,
      userAddress,
      task.attributes
    );

    const metadataURI = await ipfsService.uploadMetadata(metadata, `${baseFileName}.json`);
    console.log('metadataURI uploading ...', metadataURI);

    // Step 7: Execute mint transaction
    logger.info('Executing mint transaction', { user: userAddress, nftType, priceCEO: tierInfo.priceCEO });
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

