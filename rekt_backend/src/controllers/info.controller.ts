import { Request, Response, NextFunction } from 'express';
import { contractService } from '../services/contract.service';
import { balanceService } from '../services/balance.service';
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
      const [priceRaw, usdcDecimals] = await Promise.all([
        contractService.getCEOPrice(),
        contractService.getUSDCDecimals(),
      ]);

      // Convert raw price to human-readable format
      const priceFormatted = (Number(priceRaw) / Math.pow(10, usdcDecimals)).toString();

      res.json({
        success: true,
        data: { 
          price: priceFormatted,
          priceRaw,
          usdcDecimals,
        },
      } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/info/permit-nonce/:address
   * Get the permit nonce for an address from the CEO token contract
   */
  async getPermitNonce(req: Request, res: Response, next: NextFunction) {
    try {
      const { address } = req.params;

      const nonce = await contractService.getPermitNonce(address);

      res.json({
        success: true,
        data: { 
          address,
          nonce: nonce.toString(),
        },
      } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/info/ceo-balance/:address
   * Get the CEO token balance for an address
   */
  async getCEOBalance(req: Request, res: Response, next: NextFunction) {
    try {
      const { address } = req.params;
      const balanceData = await balanceService.getBalance(address);

      res.json({
        success: true,
        data: { address, ...balanceData },
      } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }
}

export const infoController = new InfoController();

