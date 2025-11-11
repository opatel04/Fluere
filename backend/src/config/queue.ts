import Queue from 'bull';
import config from './env';
import logger from './logger';

// Queue configuration using existing Redis setup
const queueConfig = {
  redis: {
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000, // Start with 2 seconds
    },
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 200, // Keep last 200 failed jobs
  },
};

// Define job types
export enum JobType {
  EMAIL_PROCESSING = 'email_processing',
  BATCH_PROCESSING = 'batch_processing',
  TRELLO_SYNC = 'trello_sync',
  TOKEN_REFRESH = 'token_refresh',
  FOLLOW_UP_SCAN = 'follow_up_scan',
  DAILY_SUMMARY = 'daily_summary',
}

// Job data interfaces
export interface EmailProcessingJob {
  userId: string;
  messageId: string;
  historyId?: string;
  priority?: number;
}

export interface BatchProcessingJob {
  userId: string;
  maxResults?: number;
  query?: string;
}

export interface TrelloSyncJob {
  userId: string;
  boardId: string;
  action: string;
}

export interface TokenRefreshJob {
  userId: string;
}

export interface FollowUpScanJob {
  userId?: string; // If not specified, scan for all users
  thresholdDays?: number;
}

export interface DailySummaryJob {
  userId?: string; // If not specified, generate for all users
}

// Create queues
export const emailQueue = new Queue<EmailProcessingJob>(
  'email-processing',
  queueConfig
);

export const batchQueue = new Queue<BatchProcessingJob>(
  'batch-processing',
  queueConfig
);

export const trelloQueue = new Queue<TrelloSyncJob>(
  'trello-sync',
  queueConfig
);

export const maintenanceQueue = new Queue<TokenRefreshJob>(
  'maintenance',
  queueConfig
);

export const followUpQueue = new Queue<FollowUpScanJob>(
  'follow-up-scan',
  queueConfig
);

export const dailySummaryQueue = new Queue<DailySummaryJob>(
  'daily-summary',
  queueConfig
);

// Queue event handlers
const setupQueueEventHandlers = (queue: Queue.Queue<any>, queueName: string) => {
  queue.on('active', (job: any) => {
    logger.info(`[${queueName}] Job ${job.id} started processing`);
  });

  queue.on('completed', (job: any, result: any) => {
    logger.info(`[${queueName}] Job ${job.id} completed successfully`, {
      jobId: job.id,
      result,
    });
  });

  queue.on('failed', (job: any, error: any) => {
    logger.error(`[${queueName}] Job ${job.id} failed`, {
      jobId: job.id,
      error: error.message,
      attempts: job.attemptsMade,
    });
  });

  queue.on('stalled', (job: any) => {
    logger.warn(`[${queueName}] Job ${job.id} stalled`);
  });

  queue.on('error', (error: any) => {
    logger.error(`[${queueName}] Queue error:`, error);
  });
};

// Set up event handlers for all queues
setupQueueEventHandlers(emailQueue, 'EmailQueue');
setupQueueEventHandlers(batchQueue, 'BatchQueue');
setupQueueEventHandlers(trelloQueue, 'TrelloQueue');
setupQueueEventHandlers(maintenanceQueue, 'MaintenanceQueue');
setupQueueEventHandlers(followUpQueue, 'FollowUpQueue');
setupQueueEventHandlers(dailySummaryQueue, 'DailySummaryQueue');

// Helper functions to add jobs
export const addEmailProcessingJob = async (
  data: EmailProcessingJob,
  priority: number = 5
): Promise<void> => {
  try {
    await emailQueue.add(data, {
      priority, // Lower number = higher priority
      jobId: `email-${data.userId}-${data.messageId}`, // Prevent duplicates
    });
    logger.info('Email processing job added to queue', {
      userId: data.userId,
      messageId: data.messageId,
    });
  } catch (error) {
    logger.error('Failed to add email processing job:', error);
    throw error;
  }
};

export const addBatchProcessingJob = async (
  data: BatchProcessingJob
): Promise<void> => {
  try {
    await batchQueue.add(data, {
      jobId: `batch-${data.userId}-${Date.now()}`,
    });
    logger.info('Batch processing job added to queue', {
      userId: data.userId,
    });
  } catch (error) {
    logger.error('Failed to add batch processing job:', error);
    throw error;
  }
};

export const addTrelloSyncJob = async (
  data: TrelloSyncJob
): Promise<void> => {
  try {
    await trelloQueue.add(data, {
      jobId: `trello-${data.userId}-${data.boardId}-${Date.now()}`,
    });
    logger.info('Trello sync job added to queue', {
      userId: data.userId,
      boardId: data.boardId,
    });
  } catch (error) {
    logger.error('Failed to add Trello sync job:', error);
    throw error;
  }
};

// Graceful shutdown
export const closeQueues = async (): Promise<void> => {
  logger.info('Closing all queues...');
  await Promise.all([
    emailQueue.close(),
    batchQueue.close(),
    trelloQueue.close(),
    maintenanceQueue.close(),
    followUpQueue.close(),
    dailySummaryQueue.close(),
  ]);
  logger.info('All queues closed');
};

// Queue status/monitoring
export const getQueueStatus = async () => {
  const [
    emailCounts,
    batchCounts,
    trelloCounts,
    maintenanceCounts,
    followUpCounts,
    dailySummaryCounts,
  ] = await Promise.all([
    emailQueue.getJobCounts(),
    batchQueue.getJobCounts(),
    trelloQueue.getJobCounts(),
    maintenanceQueue.getJobCounts(),
    followUpQueue.getJobCounts(),
    dailySummaryQueue.getJobCounts(),
  ]);

  return {
    email: emailCounts,
    batch: batchCounts,
    trello: trelloCounts,
    maintenance: maintenanceCounts,
    followUp: followUpCounts,
    dailySummary: dailySummaryCounts,
  };
};

export default {
  emailQueue,
  batchQueue,
  trelloQueue,
  maintenanceQueue,
  followUpQueue,
  dailySummaryQueue,
  addEmailProcessingJob,
  addBatchProcessingJob,
  addTrelloSyncJob,
  closeQueues,
  getQueueStatus,
};
