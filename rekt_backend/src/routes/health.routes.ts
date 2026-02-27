import { Router, Request, Response, IRouter } from 'express';
import { contractService } from '../services/contract.service';
import { mintQueueService } from '../services/mint-queue.service';
import { ApiResponse } from '../types';
import { providerManager } from '../utils/provider';
import { redisManager } from '../utils/redis';

const router: IRouter = Router();

// GET /api/health
router.get('/', async (req: Request, res: Response) => {
  const healthStatus: any = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    version: process.env.npm_package_version || '1.0.0',
    services: {} as Record<string, any>,
  };

  let overallHealthy = true;

  // ── Redis ─────────────────────────────────────────────────────────────────
  try {
    const start = Date.now();
    const client = await redisManager.getClient();
    if (client) {
      await client.ping();
      const latencyMs = Date.now() - start;

      // Show the host (never the password) so it's easy to verify which Redis is connected
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      let redisHost = 'unknown';
      try {
        const url = new URL(redisUrl);
        redisHost = url.hostname; // e.g. "red-xxxxx.us-east1-b.render.com"
      } catch { }

      healthStatus.services.redis = {
        status: 'healthy',
        latencyMs,
        host: redisHost,
      };
    } else {
      healthStatus.services.redis = { status: 'unhealthy', error: 'Could not connect' };
      overallHealthy = false;
    }
  } catch (error: any) {
    healthStatus.services.redis = { status: 'unhealthy', error: error.message };
    overallHealthy = false;
  }

  // ── Mint queue (powered by Redis) ─────────────────────────────────────────
  try {
    const queueStatus = await mintQueueService.getStatus();
    healthStatus.services.mintQueue = queueStatus;
  } catch {
    healthStatus.services.mintQueue = { status: 'unknown' };
  }

  // ── RPC connection ────────────────────────────────────────────────────────
  try {
    const start = Date.now();
    const provider = providerManager.getProvider();
    const blockNumber = await provider.getBlockNumber();
    healthStatus.services.rpc = {
      status: 'healthy',
      latencyMs: Date.now() - start,
      blockNumber,
    };
  } catch (error: any) {
    healthStatus.services.rpc = { status: 'unhealthy', error: error.message };
    overallHealthy = false;
  }

  // ── Backend wallet (balance only — address hidden from public, audit M-1 fix) ──
  try {
    const walletInfo = await contractService.checkBackendWalletBalance();
    const balanceETH = parseFloat(walletInfo.balanceETH);
    const lowBalance = balanceETH < 0.01; // warn if < 0.01 ETH for gas
    healthStatus.services.wallet = {
      status: lowBalance ? 'low_balance' : 'healthy',
      balanceETH: walletInfo.balanceETH,
      warning: lowBalance ? 'Backend wallet balance is low — may not be able to pay gas' : undefined,
    };
    if (lowBalance) overallHealthy = false;
  } catch (error: any) {
    healthStatus.services.wallet = { status: 'unhealthy', error: error.message };
    overallHealthy = false;
  }

  // ── IPFS ─────────────────────────────────────────────────────────────────
  healthStatus.services.ipfs = {
    status: 'assumed-healthy', // lightweight check — actual Pinata probe would burn API quota
  };

  if (!overallHealthy) {
    healthStatus.status = 'degraded';
  }

  res.status(overallHealthy ? 200 : 503).json({
    success: overallHealthy,
    data: healthStatus,
  } as ApiResponse);
});

export default router;
