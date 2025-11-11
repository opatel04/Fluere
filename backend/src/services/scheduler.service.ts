import { followUpQueue, dailySummaryQueue } from '../config/queue';
import logger from '../config/logger';

/**
 * Scheduler Service
 * Sets up repeating jobs for follow-up scanning and daily summaries
 */

class SchedulerService {
  /**
   * Initialize all scheduled jobs
   */
  async initializeScheduledJobs(): Promise<void> {
    try {
      logger.info('Initializing scheduled jobs...');

      await this.setupFollowUpScanner();
      await this.setupDailySummaryGenerator();

      logger.info('All scheduled jobs initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize scheduled jobs:', error);
      throw error;
    }
  }

  /**
   * Set up follow-up scanner (runs every 4 hours)
   * Scans for unanswered emails that need follow-up
   */
  private async setupFollowUpScanner(): Promise<void> {
    try {
      // Remove any existing repeat jobs
      const repeatableJobs = await followUpQueue.getRepeatableJobs();
      for (const job of repeatableJobs) {
        await followUpQueue.removeRepeatableByKey(job.key);
      }

      // Add repeating job: every 4 hours
      await followUpQueue.add(
        {
          thresholdDays: 2, // Default: 2 days without response
        },
        {
          repeat: {
            cron: '0 */4 * * *', // Every 4 hours at minute 0
          },
          jobId: 'follow-up-scan-scheduled',
        }
      );

      logger.info('Follow-up scanner scheduled: every 4 hours');
    } catch (error) {
      logger.error('Failed to setup follow-up scanner:', error);
      throw error;
    }
  }

  /**
   * Set up daily summary generator (runs every day at 8:00 AM)
   * Generates and sends morning briefings to users
   */
  private async setupDailySummaryGenerator(): Promise<void> {
    try {
      // Remove any existing repeat jobs
      const repeatableJobs = await dailySummaryQueue.getRepeatableJobs();
      for (const job of repeatableJobs) {
        await dailySummaryQueue.removeRepeatableByKey(job.key);
      }

      // Add repeating job: every day at 8:00 AM UTC
      // Users can customize their timezone in preferences
      await dailySummaryQueue.add(
        {},
        {
          repeat: {
            cron: '0 8 * * *', // Every day at 8:00 AM UTC
          },
          jobId: 'daily-summary-scheduled',
        }
      );

      logger.info('Daily summary generator scheduled: every day at 8:00 AM UTC');
    } catch (error) {
      logger.error('Failed to setup daily summary generator:', error);
      throw error;
    }
  }

  /**
   * Trigger manual follow-up scan for specific user
   */
  async triggerFollowUpScan(userId: string, thresholdDays: number = 2): Promise<void> {
    try {
      await followUpQueue.add(
        { userId, thresholdDays },
        {
          jobId: `follow-up-scan-manual-${userId}-${Date.now()}`,
        }
      );

      logger.info('Manual follow-up scan triggered', { userId, thresholdDays });
    } catch (error) {
      logger.error('Failed to trigger follow-up scan:', error);
      throw error;
    }
  }

  /**
   * Trigger manual daily summary for specific user
   */
  async triggerDailySummary(userId: string): Promise<void> {
    try {
      await dailySummaryQueue.add(
        { userId },
        {
          jobId: `daily-summary-manual-${userId}-${Date.now()}`,
        }
      );

      logger.info('Manual daily summary triggered', { userId });
    } catch (error) {
      logger.error('Failed to trigger daily summary:', error);
      throw error;
    }
  }

  /**
   * Get status of scheduled jobs
   */
  async getScheduledJobsStatus(): Promise<{
    followUpScanner: any[];
    dailySummary: any[];
  }> {
    try {
      const [followUpJobs, summaryJobs] = await Promise.all([
        followUpQueue.getRepeatableJobs(),
        dailySummaryQueue.getRepeatableJobs(),
      ]);

      return {
        followUpScanner: followUpJobs,
        dailySummary: summaryJobs,
      };
    } catch (error) {
      logger.error('Failed to get scheduled jobs status:', error);
      throw error;
    }
  }

  /**
   * Remove all scheduled jobs (for testing or maintenance)
   */
  async removeAllScheduledJobs(): Promise<void> {
    try {
      const followUpJobs = await followUpQueue.getRepeatableJobs();
      const summaryJobs = await dailySummaryQueue.getRepeatableJobs();

      for (const job of followUpJobs) {
        await followUpQueue.removeRepeatableByKey(job.key);
      }

      for (const job of summaryJobs) {
        await dailySummaryQueue.removeRepeatableByKey(job.key);
      }

      logger.info('All scheduled jobs removed');
    } catch (error) {
      logger.error('Failed to remove scheduled jobs:', error);
      throw error;
    }
  }
}

export default SchedulerService;
