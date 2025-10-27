import Redis from 'ioredis';
import config from './env';
import logger from './logger';

// Redis client configuration
const redisConfig = {
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
};

// Create Redis client
const redisClient = new Redis(redisConfig);

// Redis event handlers
redisClient.on('connect', () => {
  logger.info('Redis client connected');
});

redisClient.on('ready', () => {
  logger.info('Redis client ready');
});

redisClient.on('error', (error) => {
  logger.error('Redis client error:', error);
});

redisClient.on('close', () => {
  logger.warn('Redis client connection closed');
});

redisClient.on('reconnecting', () => {
  logger.info('Redis client reconnecting');
});

// Test Redis connection
export const testRedisConnection = async (): Promise<boolean> => {
  try {
    await redisClient.ping();
    logger.info('Redis connection successful');
    return true;
  } catch (error) {
    logger.error('Redis connection failed:', error);
    return false;
  }
};

// Cache helper functions
export const cache = {
  // Set a value with optional expiration (in seconds)
  set: async (key: string, value: any, expireSeconds?: number): Promise<void> => {
    try {
      const stringValue = JSON.stringify(value);
      if (expireSeconds) {
        await redisClient.setex(key, expireSeconds, stringValue);
      } else {
        await redisClient.set(key, stringValue);
      }
    } catch (error) {
      logger.error('Redis set error:', error);
      throw error;
    }
  },

  // Get a value
  get: async <T>(key: string): Promise<T | null> => {
    try {
      const value = await redisClient.get(key);
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      logger.error('Redis get error:', error);
      throw error;
    }
  },

  // Delete a value
  del: async (key: string): Promise<void> => {
    try {
      await redisClient.del(key);
    } catch (error) {
      logger.error('Redis delete error:', error);
      throw error;
    }
  },

  // Check if key exists
  exists: async (key: string): Promise<boolean> => {
    try {
      const result = await redisClient.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Redis exists error:', error);
      throw error;
    }
  },

  // Set expiration on a key
  expire: async (key: string, seconds: number): Promise<void> => {
    try {
      await redisClient.expire(key, seconds);
    } catch (error) {
      logger.error('Redis expire error:', error);
      throw error;
    }
  },

  // Get all keys matching a pattern
  keys: async (pattern: string): Promise<string[]> => {
    try {
      return await redisClient.keys(pattern);
    } catch (error) {
      logger.error('Redis keys error:', error);
      throw error;
    }
  },

  // Flush all data (use with caution!)
  flushAll: async (): Promise<void> => {
    try {
      await redisClient.flushall();
      logger.warn('Redis: All data flushed');
    } catch (error) {
      logger.error('Redis flush error:', error);
      throw error;
    }
  },
};

// Close Redis connection
export const closeRedis = async (): Promise<void> => {
  try {
    await redisClient.quit();
    logger.info('Redis connection closed');
  } catch (error) {
    logger.error('Error closing Redis connection:', error);
    throw error;
  }
};

export default redisClient;
