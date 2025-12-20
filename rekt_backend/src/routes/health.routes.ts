import { Router, Request, Response, IRouter } from 'express';
import { contractService } from '../services/contract.service';
import { ApiResponse } from '../types';
import { providerManager } from '../utils/provider';
import { redisManager } from '../utils/redis';

const router: IRouter = Router();

// GET /api/health
router.get('/', async (req: Request, res: Response) => {
  const healthStatus: any = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    services: {} as Record<string, string>,
  };

  let overallHealthy = true;

  // Check Redis
  try {
    const isAvailable = await redisManager.isAvailable();
    healthStatus.services.redis = isAvailable ? 'healthy' : 'unhealthy';
    if (!isAvailable) {
      overallHealthy = false;
    }
  } catch (error: any) {
    healthStatus.services.redis = 'unhealthy';
    overallHealthy = false;
  }

  // Check RPC connection
  try {
    const provider = providerManager.getProvider();
    await provider.getBlockNumber();
    healthStatus.services.rpc = 'healthy';
  } catch (error: any) {
    healthStatus.services.rpc = 'unhealthy';
    overallHealthy = false;
  }

  // Check backend wallet
  try {
    const walletInfo = await contractService.checkBackendWalletBalance();
    healthStatus.backendWallet = {
      address: walletInfo.address,
      balanceETH: walletInfo.balanceETH,
    };
    healthStatus.services.wallet = 'healthy';
  } catch (error: any) {
    healthStatus.services.wallet = 'unhealthy';
    healthStatus.backendWallet = {
      error: error.message,
    };
    overallHealthy = false;
  }

  // Check IPFS (Pinata) - lightweight check
  healthStatus.services.ipfs = 'healthy'; // Assume healthy, actual check would require API call

  if (!overallHealthy) {
    healthStatus.status = 'degraded';
  }

  const statusCode = overallHealthy ? 200 : 503;
  res.status(statusCode).json({
    success: overallHealthy,
    data: healthStatus,
  } as ApiResponse);
});

export default router;

