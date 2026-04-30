import { Request, Response, NextFunction } from 'express';
import { ApiResponse, AppError } from '../types';
import { campaignService } from '../services/campaign.service';

export class DailyController {
  async claimCheckin(req: Request, res: Response, next: NextFunction) {
    try {
      const address = req.user?.address;
      if (!address) {
        throw new AppError(401, 'Authentication required');
      }

      const data = await campaignService.claimDailyCheckin(address);
      res.json({ success: true, data } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }

  async claimSpin(req: Request, res: Response, next: NextFunction) {
    try {
      const address = req.user?.address;
      if (!address) {
        throw new AppError(401, 'Authentication required');
      }

      const data = await campaignService.claimDailySpin(address);
      res.json({ success: true, data } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }

  async getState(req: Request, res: Response, next: NextFunction) {
    try {
      const address = req.user?.address;
      if (!address) {
        throw new AppError(401, 'Authentication required');
      }

      const data = await campaignService.getDailyState(address);
      res.json({ success: true, data } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }
}

export const dailyController = new DailyController();
