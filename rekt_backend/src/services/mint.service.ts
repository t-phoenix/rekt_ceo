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

    // Step 4: Mint on-chain with a placeholder URI first.
    // We cannot reliably predict the tokenId before minting (race condition with
    // concurrent mints or direct contract calls). The contract assigns the real
    // tokenId which we read from the NFTPurchased event, then use for IPFS upload.
    const PLACEHOLDER_URI = 'ipfs://pending';
    logger.info('Executing mint transaction (phase 1 — placeholder URI)', { user: userAddress, nftType });
    const { txHash, tokenId } = await contractService.mintNFTWithPermit(
      nftType,
      PLACEHOLDER_URI,
      permitSignature
    );

    logger.info('Mint confirmed — got real tokenId', { tokenId, txHash });

    // Step 5: Now upload image to IPFS using the REAL tokenId
    const collectionName = nftType === 'PFP' ? 'Rekt CEO PFP' : 'Rekt CEO Meme';
    const baseFileName = `${collectionName} #${tokenId}`;

    logger.info('Uploading image to IPFS', { user: userAddress, fileName: baseFileName });
    const imageURI = await ipfsService.uploadImage(
      imageData,
      `${baseFileName}.png`
    );

    // Step 6: Generate and upload metadata with the correct tokenId
    logger.info('Generating metadata', { user: userAddress, tokenId });
    const metadata = ipfsService.generateMetadata(
      nftType,
      tokenId,
      imageURI,
      userAddress,
      task.attributes
    );

    const metadataURI = await ipfsService.uploadMetadata(metadata, `${baseFileName}.json`);
    logger.info('Metadata uploaded to IPFS', { metadataURI });

    // Step 7: Update the on-chain token URI to the final IPFS metadata
    logger.info('Setting final token URI on-chain', { tokenId, metadataURI });
    await contractService.setNFTTokenURI(nftType, tokenId, metadataURI);

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

