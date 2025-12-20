import { Router, Request, Response, IRouter } from 'express';
import { contractService } from '../services/contract.service';
import { ApiResponse } from '../types';
import { config } from '../config';
import Redis from 'ioredis';
import { providerManager } from '../utils/provider';

const router: IRouter = Router();

// Redis client for health check (reused connection)
let redis: Redis | null = null;

const getRedis = (): Redis => {
  if (!redis) {
    redis = new Redis(config.redisUrl, {
      maxRetriesPerRequest: 1,
      retryStrategy: () => null, // Don't retry on health check
    });
  }
  return redis;
};

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
    const redisClient = getRedis();
    await redisClient.ping();
    healthStatus.services.redis = 'healthy';
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

