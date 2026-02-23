import { PinataSDK } from 'pinata';
import { config } from '../config';
import { logger } from '../utils/logger';
import { AppError, NFTMetadata } from '../types';
import { validateImage } from '../utils/image-validator';

class IPFSService {
  private pinata: PinataSDK;

  constructor() {
    this.pinata = new PinataSDK({
      pinataJwt: config.pinataJwt,
      pinataGateway: config.pinataGateway,
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

      // Upload to Pinata (new SDK uses upload.public.file)
      const upload = await this.pinata.upload.public.file(file);

      const ipfsHash = upload.cid;
      const uri = `ipfs://${ipfsHash}`;

      logger.info('Image uploaded to IPFS', { uri, hash: ipfsHash });

      return uri;
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Failed to upload image to IPFS:', {
        message: error.message,
        status: error.status,
        response: error.response?.data,
        stack: error.stack,
      });
      throw new AppError(500, `Failed to upload image to IPFS: ${error.message}`);
    }
  }

  /**
   * Upload metadata JSON to IPFS
   */
  async uploadMetadata(metadata: NFTMetadata, filename: string): Promise<string> {
    try {
      logger.info('Uploading metadata to IPFS...', { name: metadata.name });

      // Convert JSON object to a string and then to a File object
      const jsonString = JSON.stringify(metadata, null, 2);
      const file = new File([jsonString], filename, { type: 'application/json' });

      // Upload to Pinata
      const upload = await this.pinata.upload.public.file(file);

      const ipfsHash = upload.cid;
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
    creatorAddress: string,
    additionalAttributes?: Record<string, string | number> | Array<{ trait_type: string; value: string | number }>
  ): NFTMetadata {
    const collectionName = nftType === 'PFP' ? 'Rekt CEO PFP' : 'Rekt CEO Meme';

    let parsedAttributes: Array<{ trait_type: string; value: string | number }> = [
      {
        trait_type: 'Type',
        value: nftType,
      },
      {
        trait_type: 'Token ID',
        value: tokenId,
      },
    ];

    if (additionalAttributes) {
      if (Array.isArray(additionalAttributes)) {
        parsedAttributes = [...parsedAttributes, ...additionalAttributes];
      } else if (typeof additionalAttributes === 'object') {
        Object.entries(additionalAttributes).forEach(([key, value]) => {
          parsedAttributes.push({
            trait_type: key,
            value: value,
          });
        });
      }
    }

    return {
      name: `${collectionName} #${tokenId}`,
      description: `Part of the Rekt CEO ${nftType} collection`,
      image: imageUri,
      external_url: 'https://rektceo.club',
      attributes: parsedAttributes,
      created_by: creatorAddress,
      created_at: Math.floor(Date.now() / 1000),
    };
  }
}

export const ipfsService = new IPFSService();
