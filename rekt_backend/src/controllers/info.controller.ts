import { Request, Response, NextFunction } from 'express';
import { contractService } from '../services/contract.service';
import { ApiResponse, UserMintInfo } from '../types';

export class InfoController {
  /**
   * GET /api/info/pricing/:nftType
   */
  async getPricing(req: Request, res: Response, next: NextFunction) {
    try {
      const { nftType } = req.params;

      if (nftType !== 'PFP' && nftType !== 'MEME') {
        return res.status(400).json({
          success: false,
          error: 'Invalid NFT type. Must be PFP or MEME',
        } as ApiResponse);
      }

      const tierInfo = await contractService.getCurrentTierInfo(nftType);

      res.json({
        success: true,
        data: tierInfo,
      } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/info/user/:address
   */
  async getUserInfo(req: Request, res: Response, next: NextFunction) {
    try {
      const { address } = req.params;

      // Get mint counts and eligibility for both types
      const [pfpCount, pfpCanMint, memeCount, memeCanMint] = await Promise.all([
        contractService.getUserMintCount(address, 'PFP'),
        contractService.canUserMint(address, 'PFP'),
        contractService.getUserMintCount(address, 'MEME'),
        contractService.canUserMint(address, 'MEME'),
      ]);

      const userInfo: UserMintInfo = {
        address,
        pfp: {
          mintCount: pfpCount,
          canMint: pfpCanMint,
          maxMint: 2,
        },
        meme: {
          mintCount: memeCount,
          canMint: memeCanMint,
          maxMint: 9,
        },
      };

      res.json({
        success: true,
        data: userInfo,
      } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/info/ceo-price
   */
  async getCEOPrice(req: Request, res: Response, next: NextFunction) {
    try {
      const price = await contractService.getCEOPrice();

      res.json({
        success: true,
        data: { price },
      } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }
}

export const infoController = new InfoController();

