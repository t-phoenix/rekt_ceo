import { Router, Request, Response, IRouter } from 'express';
import { contractService } from '../services/contract.service';
import { ApiResponse } from '../types';

const router: IRouter = Router();

// GET /api/health
router.get('/', async (req: Request, res: Response) => {
  try {
    // Check backend wallet balance
    const walletInfo = await contractService.checkBackendWalletBalance();

    res.json({
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        backendWallet: {
          address: walletInfo.address,
          balanceETH: walletInfo.balanceETH,
        },
      },
    } as ApiResponse);
  } catch (error: any) {
    res.status(503).json({
      success: false,
      error: 'Service unhealthy',
      message: error.message,
    } as ApiResponse);
  }
});

export default router;

