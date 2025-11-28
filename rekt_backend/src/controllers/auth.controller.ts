import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { ApiResponse } from '../types';

export class AuthController {
  /**
   * POST /api/auth/nonce
   */
  async getNonce(req: Request, res: Response, next: NextFunction) {
    try {
      const { address } = req.body;

      if (!address) {
        return res.status(400).json({
          success: false,
          error: 'Address is required',
        } as ApiResponse);
      }

      const nonce = await authService.generateNonce(address);

      res.json({
        success: true,
        data: { nonce },
      } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/verify
   */
  async verifySignature(req: Request, res: Response, next: NextFunction) {
    try {
      const { message, signature } = req.body;

      if (!message || !signature) {
        return res.status(400).json({
          success: false,
          error: 'Message and signature are required',
        } as ApiResponse);
      }

      const result = await authService.verifySignature(message, signature);

      res.json({
        success: true,
        data: result,
      } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();

