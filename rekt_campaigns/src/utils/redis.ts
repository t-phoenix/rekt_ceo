import Redis from 'ioredis';
import { config } from '../config';
import { logger } from './logger';

class RedisManager {
  private client: Redis | null = null;
  private isConnecting = false;
  private connectionPromise: Promise<Redis | null> | null = null;

  /**
   * Get or create Redis client with lazy initialization
   */
  async getClient(): Promise<Redis | null> {
    // If already connected, return client
    if (this.client && this.client.status === 'ready') {
      return this.client;
    }

    // If connection is in progress, wait for it
    if (this.isConnecting && this.connectionPromise) {
      return this.connectionPromise;
    }

    // Start new connection
    this.isConnecting = true;
    this.connectionPromise = this.connect();

    return this.connectionPromise;
  }

  /**
   * Connect to Redis with retry logic
   */
  private async connect(): Promise<Redis | null> {
    try {
      // Use config.redisUrl with fallback
      const redisUrl = config.redisUrl || 'redis://localhost:6379';
      const client = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          if (times > 10) {
            logger.warn('Redis: Max retry attempts reached, giving up');
            return null; // Stop retrying
          }
          const delay = Math.min(times * 100, 3000);
          logger.warn(`Redis: Retrying connection (attempt ${times}) in ${delay}ms`);
          return delay;
        },
        reconnectOnError: (err) => {
          const targetError = 'READONLY';
          if (err.message.includes(targetError)) {
            return true; // Reconnect on READONLY error
          }
          return false;
        },
        enableReadyCheck: true,
        lazyConnect: true, // Don't connect immediately
      });

      // Set up error handlers
      client.on('error', (err) => {
        logger.error('Redis connection error:', err.message);
        // Don't crash the app, just log the error
      });

      client.on('connect', () => {
        logger.info('Redis: Connecting...');
      });

      client.on('ready', () => {
        logger.info('Redis: Connected and ready');
        this.isConnecting = false;
      });

      client.on('close', () => {
        logger.warn('Redis: Connection closed');
        this.client = null;
        this.isConnecting = false;
      });

      // Attempt to connect
      await client.connect();
      this.client = client;
      return client;
    } catch (error: any) {
      logger.error('Redis: Failed to connect:', error.message);
      this.isConnecting = false;
      this.client = null;
      // Return null instead of throwing - allows graceful degradation
      return null;
    }
  }

  /**
   * Check if Redis is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const client = await this.getClient();
      if (!client) return false;
      await client.ping();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
    }
    this.isConnecting = false;
    this.connectionPromise = null;
  }
}

export const redisManager = new RedisManager();

