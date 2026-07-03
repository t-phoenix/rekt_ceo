import { logger } from '../utils/logger';
import { redisManager } from '../utils/redis';

const QUEUE_KEY = 'mint:queue';       // Redis List — serialised task payloads
const LOCK_KEY = 'mint:processing';   // Redis key that acts as a processing lock
const USER_KEY_PREFIX = 'mint:user:'; // per-user pending flag: mint:user:<address>-<type>
const LOCK_TTL = 10 * 60;            // 10 min max per task (safety expiry on lock)
const USER_TTL = 15 * 60;            // 15 min user duplicate guard

interface StoredTask {
  id: string;
  userAddress: string;
  nftType: 'PFP' | 'MEME';
  imageData: string;
  permitSignature: any;
  attributes?: Record<string, string | number> | Array<{ trait_type: string; value: string | number }>;
}

class MintQueueService {
  // In-memory pending promises so the HTTP response can still await the queue result
  private pendingResolvers = new Map<string, { resolve: (v: any) => void; reject: (e: any) => void }>();
  private workerRunning = false;

  // ─── Public: Enqueue ─────────────────────────────────────────────────────────

  /**
   * Add a mint task to the Redis-backed queue.
   * Returns a Promise that resolves/rejects when the task is processed.
   * The queue is persistent: tasks survive server restarts.
   */
  async addToQueue(task: Omit<StoredTask, never>): Promise<any> {
    const redis = await redisManager.getClient();

    if (!redis) {
      // Graceful degradation: warn clearly, then fall through to in-memory processing
      logger.warn('Redis unavailable — processing mint synchronously (no durability)');
      const { mintService } = await import('./mint.service');
      return mintService.processMint(task);
    }

    const userKey = `${USER_KEY_PREFIX}${task.userAddress.toLowerCase()}-${task.nftType}`;

    // Duplicate guard: one pending mint per (user, nftType) at a time
    const alreadyPending = await redis.get(userKey);
    if (alreadyPending) {
      throw new Error('You already have a pending mint for this NFT type');
    }

    // Mark user as having a pending mint
    await redis.setex(userKey, USER_TTL, task.id);

    // Push task to the tail of the Redis list (FIFO queue)
    const payload = JSON.stringify(task);
    await redis.rpush(QUEUE_KEY, payload);

    logger.info('Task added to Redis queue', {
      id: task.id,
      user: task.userAddress,
      nftType: task.nftType,
      queueLength: await redis.llen(QUEUE_KEY),
    });

    // Register in-memory resolver so the HTTP handler can await the result
    const resultPromise = new Promise<any>((resolve, reject) => {
      this.pendingResolvers.set(task.id, { resolve, reject });
    });

    // Ensure the worker is running
    this.ensureWorker();

    return resultPromise;
  }

  // ─── Worker ──────────────────────────────────────────────────────────────────

  private ensureWorker(): void {
    if (!this.workerRunning) {
      this.workerRunning = true;
      this.runWorker().catch((err) => {
        logger.error('Mint queue worker crashed', err);
        this.workerRunning = false;
      });
    }
  }

  private async runWorker(): Promise<void> {
    logger.info('Mint queue worker started');

    while (true) {
      const redis = await redisManager.getClient();
      if (!redis) {
        // Redis lost mid-run — pause and retry
        await new Promise((r) => setTimeout(r, 3000));
        continue;
      }

      // BLPOP: block for up to 5 s waiting for a task, then loop (allows graceful shutdown)
      let item: [string, string] | null = null;
      try {
        item = await redis.blpop(QUEUE_KEY, 5) as [string, string] | null;
      } catch (err: any) {
        logger.warn('Queue BLPOP error, retrying', err.message);
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }

      if (!item) continue; // timeout, no tasks — loop again

      const [, payload] = item;
      let task: StoredTask;

      try {
        task = JSON.parse(payload);
      } catch {
        logger.error('Failed to parse queued task, discarding', { payload });
        continue;
      }

      const userKey = `${USER_KEY_PREFIX}${task.userAddress.toLowerCase()}-${task.nftType}`;

      // Acquire a distributed processing lock so a race between two
      // server instances (e.g. Render zero-downtime deploy) can't double-process
      const lockAcquired = await redis.set(
        LOCK_KEY,
        task.id,
        'EX', LOCK_TTL,
        'NX' // only set if key doesn't already exist
      );

      if (!lockAcquired) {
        // Another instance is processing — put the task back and wait
        logger.warn('Lock held by another instance, re-queuing task', { id: task.id });
        await redis.lpush(QUEUE_KEY, payload); // put back at head
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }

      logger.info('Processing mint task', {
        id: task.id,
        user: task.userAddress,
        nftType: task.nftType,
      });

      try {
        const { mintService } = await import('./mint.service');
        const result = await mintService.processMint(task);

        logger.info('Mint task completed', { id: task.id });

        // Resolve the in-process awaiter (if the HTTP request is still connected)
        this.pendingResolvers.get(task.id)?.resolve(result);
      } catch (error: any) {
        logger.error('Mint task failed', {
          id: task.id,
          user: task.userAddress,
          error: error.message,
        });

        this.pendingResolvers.get(task.id)?.reject(error);
      } finally {
        // Always clean up: release lock and user pending flag
        this.pendingResolvers.delete(task.id);
        await redis.del(LOCK_KEY).catch(() => { });
        await redis.del(userKey).catch(() => { });

        // Small delay between tasks to avoid hammering the chain/IPFS
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  }

  // ─── Status ──────────────────────────────────────────────────────────────────

  async getStatus(): Promise<{ queueLength: number; processing: boolean; backend: string }> {
    const redis = await redisManager.getClient();
    if (!redis) {
      return { queueLength: 0, processing: false, backend: 'in-memory (Redis unavailable)' };
    }

    const [queueLength, lock] = await Promise.all([
      redis.llen(QUEUE_KEY),
      redis.get(LOCK_KEY),
    ]);

    return {
      queueLength,
      processing: !!lock,
      backend: 'redis',
    };
  }
}

export const mintQueueService = new MintQueueService();
