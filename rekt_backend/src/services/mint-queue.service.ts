import { logger } from '../utils/logger';

interface MintTask {
  id: string;
  userAddress: string;
  nftType: 'PFP' | 'MEME';
  imageData: string;
  permitSignature: any;
  attributes?: Record<string, string | number> | Array<{ trait_type: string; value: string | number }>;
  resolve: (result: any) => void;
  reject: (error: any) => void;
}

class MintQueueService {
  private queue: MintTask[] = [];
  private processing: boolean = false;
  private userQueues: Map<string, number> = new Map(); // Track concurrent requests per user

  /**
   * Add mint task to queue
   */
  async addToQueue(task: Omit<MintTask, 'resolve' | 'reject'>): Promise<any> {
    return new Promise((resolve, reject) => {
      // Check if user already has a pending mint
      const userKey = `${task.userAddress}-${task.nftType}`;
      const userQueueCount = this.userQueues.get(userKey) || 0;

      if (userQueueCount > 0) {
        reject(new Error('You already have a pending mint for this NFT type'));
        return;
      }

      // Add to user queue counter
      this.userQueues.set(userKey, userQueueCount + 1);

      // Add to queue
      this.queue.push({ ...task, resolve, reject });

      logger.info('Task added to queue', {
        id: task.id,
        user: task.userAddress,
        nftType: task.nftType,
        queueLength: this.queue.length,
      });

      // Start processing if not already processing
      if (!this.processing) {
        this.processQueue();
      }
    });
  }

  /**
   * Process queue sequentially
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const task = this.queue.shift()!;
      const userKey = `${task.userAddress}-${task.nftType}`;

      try {
        logger.info('Processing mint task', {
          id: task.id,
          user: task.userAddress,
          nftType: task.nftType,
        });

        // Import here to avoid circular dependency
        const { mintService } = await import('./mint.service');
        const result = await mintService.processMint(task);

        // Decrement user queue counter
        const count = this.userQueues.get(userKey) || 1;
        if (count <= 1) {
          this.userQueues.delete(userKey);
        } else {
          this.userQueues.set(userKey, count - 1);
        }

        task.resolve(result);
      } catch (error: any) {
        logger.error('Mint task failed', {
          id: task.id,
          user: task.userAddress,
          error: error.message,
        });

        // Decrement user queue counter
        const count = this.userQueues.get(userKey) || 1;
        if (count <= 1) {
          this.userQueues.delete(userKey);
        } else {
          this.userQueues.set(userKey, count - 1);
        }

        task.reject(error);
      }

      // Small delay between tasks
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    this.processing = false;
  }

  /**
   * Get queue status
   */
  getStatus() {
    return {
      queueLength: this.queue.length,
      processing: this.processing,
      userQueues: Array.from(this.userQueues.entries()),
    };
  }
}

export const mintQueueService = new MintQueueService();

