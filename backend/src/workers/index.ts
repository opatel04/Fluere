/**
 * Worker Entry Point
 * Starts all background job workers
 */
import logger from '../config/logger';
import { testRedisConnection } from '../config/redis';

// Import workers (this will start listening to queues)
import './email.worker';

const startWorkers = async () => {
  try {
    logger.info('Starting TaskSnap workers...');

    // Test Redis connection
    const redisConnected = await testRedisConnection();
    if (!redisConnected) {
      throw new Error('Failed to connect to Redis');
    }

    logger.info('All workers started successfully');
    logger.info('Worker processes are now listening for jobs');
  } catch (error) {
    logger.error('Failed to start workers:', error);
    process.exit(1);
  }
};

// Start the workers
startWorkers();

// Handle uncaught errors
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});
