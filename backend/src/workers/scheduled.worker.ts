import { Job } from 'bull';
import {
  followUpQueue,
  dailySummaryQueue,
  FollowUpScanJob,
  DailySummaryJob,
} from '../config/queue';
import FollowUpService from '../services/follow-up.service';
import SummaryService from '../services/summary.service';
import logger from '../config/logger';
import { query } from '../config/database';

/**
 * Scheduled Jobs Worker
 * Processes follow-up scanning and daily summary generation
 */

const followUpService = new FollowUpService();
const summaryService = new SummaryService();

// Process follow-up scan jobs
followUpQueue.process(async (job: Job<FollowUpScanJob>) => {
  const { userId, thresholdDays } = job.data;

  logger.info('Processing follow-up scan job', {
    jobId: job.id,
    userId: userId || 'all users',
    thresholdDays: thresholdDays || 2,
  });

  try {
    if (userId) {
      // Scan for specific user
      const createdCount = await followUpService.detectAndCreateFollowUps(
        userId,
        thresholdDays || 2
      );

      logger.info('Follow-up scan completed for user', {
        userId,
        createdCount,
      });

      return { userId, createdCount };
    } else {
      // Scan for all users
      const users = await query(
        `SELECT id, email FROM users WHERE is_active = true`
      );

      let totalCreated = 0;
      const results = [];

      for (const user of users.rows) {
        try {
          const createdCount = await followUpService.detectAndCreateFollowUps(
            user.id,
            thresholdDays || 2
          );
          totalCreated += createdCount;
          results.push({ userId: user.id, email: user.email, createdCount });

          logger.info('Follow-up scan completed for user', {
            userId: user.id,
            email: user.email,
            createdCount,
          });
        } catch (error: any) {
          logger.error('Error scanning follow-ups for user', {
            userId: user.id,
            error: error.message,
          });
          results.push({
            userId: user.id,
            email: user.email,
            error: error.message,
          });
        }
      }

      logger.info('Follow-up scan completed for all users', {
        totalUsers: users.rows.length,
        totalCreated,
      });

      return { totalUsers: users.rows.length, totalCreated, results };
    }
  } catch (error: any) {
    logger.error('Follow-up scan job failed', {
      jobId: job.id,
      error: error.message,
    });
    throw error;
  }
});

// Process daily summary jobs
dailySummaryQueue.process(async (job: Job<DailySummaryJob>) => {
  const { userId } = job.data;

  logger.info('Processing daily summary job', {
    jobId: job.id,
    userId: userId || 'all users',
  });

  try {
    if (userId) {
      // Generate for specific user
      const summary = await summaryService.generateDailySummary(userId);

      logger.info('Daily summary generated for user', {
        userId,
        generated: summary !== null,
      });

      return { userId, summary };
    } else {
      // Generate for users whose preferred time matches current hour in their timezone
      const users = await query(
        `SELECT u.id, u.email,
                up.daily_summary_enabled,
                up.daily_summary_time,
                up.daily_summary_timezone
         FROM users u
         LEFT JOIN user_preferences up ON u.id = up.user_id
         WHERE u.is_active = true
         AND (up.daily_summary_enabled IS NULL OR up.daily_summary_enabled = true)`
      );

      let totalGenerated = 0;
      let totalChecked = 0;
      const results = [];

      for (const user of users.rows) {
        try {
          totalChecked++;

          // Get user's preferred time and timezone
          const preferredTime = user.daily_summary_time || '08:00:00';
          const timezone = user.daily_summary_timezone || 'UTC';

          // Check if it's time to send for this user
          const shouldSend = await summaryService.shouldSendSummaryNow(
            user.id,
            preferredTime,
            timezone
          );

          if (!shouldSend) {
            continue; // Skip this user, not their time yet
          }

          const summary = await summaryService.generateDailySummary(user.id);
          if (summary) {
            totalGenerated++;
          }
          results.push({
            userId: user.id,
            email: user.email,
            generated: summary !== null,
          });

          logger.info('Daily summary generated for user', {
            userId: user.id,
            email: user.email,
            timezone,
            preferredTime,
            generated: summary !== null,
          });
        } catch (error: any) {
          logger.error('Error generating summary for user', {
            userId: user.id,
            error: error.message,
          });
          results.push({
            userId: user.id,
            email: user.email,
            error: error.message,
          });
        }
      }

      logger.info('Daily summary generation completed', {
        totalChecked,
        totalGenerated,
        results: results.length,
      });

      return {
        totalChecked,
        totalGenerated,
        results,
      };
    }
  } catch (error: any) {
    logger.error('Daily summary job failed', {
      jobId: job.id,
      error: error.message,
    });
    throw error;
  }
});

// Graceful shutdown handler
const gracefulShutdown = async () => {
  logger.info('Scheduled worker shutting down gracefully...');

  await followUpQueue.close();
  await dailySummaryQueue.close();

  logger.info('Scheduled worker shutdown complete');
  process.exit(0);
};

// Handle shutdown signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

logger.info('Scheduled worker started and listening for jobs');

export { followUpQueue, dailySummaryQueue };
