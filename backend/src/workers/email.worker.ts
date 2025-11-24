import { Job } from 'bull';
import { emailQueue, batchQueue, EmailProcessingJob, BatchProcessingJob } from '../config/queue';
import emailProcessorService from '../services/email-processor.service';
import logger from '../config/logger';
import db from '../config/database';

/**
 * Email Processing Worker
 * Processes email-related jobs from Bull queues in the background
 */

// Process single email job - concurrency of 5 for parallel processing
emailQueue.process(5, async (job: Job<EmailProcessingJob>) => {
  const { userId, messageId, historyId } = job.data;

  logger.info('Processing email job', {
    jobId: job.id,
    userId,
    messageId,
    attempt: job.attemptsMade + 1,
  });

  const startTime = Date.now();

  try {
    // Update job status in database
    const jobRecord = await db.query(
      `INSERT INTO processing_jobs (id, user_id, job_type, job_status, job_data, started_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (id) DO UPDATE SET
         job_status = $4,
         started_at = NOW()
       RETURNING *`,
      [
        job.id,
        userId,
        'email_processing',
        'processing',
        JSON.stringify(job.data),
      ]
    );

    // Process the email to pending queue using FAST method (no AI)
    // Just stores email metadata - AI description generated on-demand when user clicks
    const result = await emailProcessorService.processEmailToPendingFast(userId, messageId);

    // Update job status to completed
    await db.query(
      `UPDATE processing_jobs
       SET job_status = $1,
           result = $2,
           completed_at = NOW()
       WHERE id = $3`,
      ['completed', JSON.stringify(result), job.id]
    );

    // Update email status in database (fast processing = 1 task per email, no confidence yet)
    await db.query(
      `UPDATE emails
       SET processing_status = $1,
           tasks_count = $2,
           processed_at = NOW()
       WHERE message_id = $3 AND user_id = $4`,
      [
        'completed',
        result.taskSaved ? 1 : 0,
        messageId,
        userId,
      ]
    );

    const processingTime = Date.now() - startTime;

    logger.info('Email job completed successfully (fast mode)', {
      jobId: job.id,
      taskSaved: result.taskSaved,
      taskId: result.taskId,
      processingTimeMs: processingTime,
    });

    return result;
  } catch (error: any) {
    const processingTime = Date.now() - startTime;

    logger.error('Email job failed', {
      jobId: job.id,
      userId,
      messageId,
      error: error.message,
      attempt: job.attemptsMade + 1,
      processingTimeMs: processingTime,
    });

    // Update job status to failed
    await db.query(
      `UPDATE processing_jobs
       SET job_status = $1,
           error_message = $2,
           completed_at = NOW()
       WHERE id = $3`,
      ['failed', error.message, job.id]
    );

    // Update email status in database
    await db.query(
      `UPDATE emails
       SET processing_status = $1,
           error_message = $2
       WHERE message_id = $3 AND user_id = $4`,
      ['failed', error.message, messageId, userId]
    );

    // Re-throw to let Bull handle retries
    throw error;
  }
});

// Process batch email job
batchQueue.process(async (job: Job<BatchProcessingJob>) => {
  const { userId, maxResults, query } = job.data;

  logger.info('Processing batch email job', {
    jobId: job.id,
    userId,
    maxResults,
    attempt: job.attemptsMade + 1,
  });

  const startTime = Date.now();

  try {
    // Update job status in database
    await db.query(
      `INSERT INTO processing_jobs (id, user_id, job_type, job_status, job_data, started_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (id) DO UPDATE SET
         job_status = $4,
         started_at = NOW()`,
      [
        job.id,
        userId,
        'batch_processing',
        'processing',
        JSON.stringify(job.data),
      ]
    );

    // Process batch of emails to pending queue
    const result = await emailProcessorService.processEmailsToPending(userId, {
      maxEmails: maxResults || 10,
      query,
    });

    // Update job status to completed
    await db.query(
      `UPDATE processing_jobs
       SET job_status = $1,
           result = $2,
           completed_at = NOW()
       WHERE id = $3`,
      ['completed', JSON.stringify(result), job.id]
    );

    const processingTime = Date.now() - startTime;

    logger.info('Batch job completed successfully', {
      jobId: job.id,
      emailsProcessed: result.emailsProcessed,
      totalTasksExtracted: result.totalTasksExtracted,
      totalTasksSaved: result.totalTasksSaved,
      averageConfidence: result.averageConfidence,
      processingTimeMs: processingTime,
    });

    return result;
  } catch (error: any) {
    const processingTime = Date.now() - startTime;

    logger.error('Batch job failed', {
      jobId: job.id,
      userId,
      error: error.message,
      attempt: job.attemptsMade + 1,
      processingTimeMs: processingTime,
    });

    // Update job status to failed
    await db.query(
      `UPDATE processing_jobs
       SET job_status = $1,
           error_message = $2,
           completed_at = NOW()
       WHERE id = $3`,
      ['failed', error.message, job.id]
    );

    // Re-throw to let Bull handle retries
    throw error;
  }
});

// Graceful shutdown handler
const gracefulShutdown = async () => {
  logger.info('Worker shutting down gracefully...');

  // Wait for ongoing jobs to complete (max 30 seconds)
  await emailQueue.close();
  await batchQueue.close();

  logger.info('Worker shutdown complete');
  process.exit(0);
};

// Handle shutdown signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

logger.info('Email worker started and listening for jobs');

export { emailQueue, batchQueue };
