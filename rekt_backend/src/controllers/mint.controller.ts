import { Request, Response, NextFunction } from 'express';
import { mintQueueService } from '../services/mint-queue.service';
import { ApiResponse, permitSignatureSchema } from '../types';

export class MintController {
  /**
   * POST /api/mint/initiate
   */
  async initiateMint(req: Request, res: Response, next: NextFunction) {
    try {
      const { nftType, imageData, permitSignature } = req.body;
      const userAddress = req.user!.address;

      // Validate NFT type
      if (nftType !== 'PFP' && nftType !== 'MEME') {
        return res.status(400).json({
          success: false,
          error: 'Invalid NFT type. Must be PFP or MEME',
        } as ApiResponse);
      }

      // Validate image data
      if (!imageData || typeof imageData !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Image data is required',
        } as ApiResponse);
      }

      // Validate permit signature
      const permitValidation = permitSignatureSchema.safeParse(permitSignature);
      if (!permitValidation.success) {
        return res.status(400).json({
          success: false,
          error: 'Invalid permit signature',
          data: permitValidation.error.format(),
        } as ApiResponse);
      }

      // Generate unique ID for this mint task
      const taskId = `${userAddress}-${nftType}-${Date.now()}`;

      // Add to queue (returns immediately)
      const result = await mintQueueService.addToQueue({
        id: taskId,
        userAddress,
        nftType,
        imageData,
        permitSignature: permitValidation.data,
      });

      res.json({
        success: true,
        data: result,
        message: 'Mint completed successfully',
      } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }
}

export const mintController = new MintController();

