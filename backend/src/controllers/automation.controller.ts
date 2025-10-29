import { Request, Response, NextFunction } from 'express';
import { addEmailProcessingJob, addBatchProcessingJob } from '../config/queue';
import gmailService from '../services/gmail.service';
import logger from '../config/logger';
import db from '../config/database';

/**
 * Automation Controller
 * One-click automation endpoints
 */

/**
 * Auto-process all unread emails
 * POST /api/v1/automation/process-inbox
 *
 * This endpoint:
 * 1. Fetches all unread emails from Gmail
 * 2. Enqueues background jobs for each email
 * 3. Worker handles: AI extraction, task sorting, labeling, Trello card creation
 * 4. Returns immediately with job IDs
 */
export const processInbox = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { userId, maxEmails = 50, labelFilter = 'INBOX' } = req.body;

    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'userId is required',
      });
      return;
    }

    logger.info(`Starting auto-process inbox for user ${userId}`);

    // Check if user has Gmail connected
    const isConnected = await gmailService.isConnected(userId);
    if (!isConnected) {
      res.status(400).json({
        success: false,
        error: 'Gmail not connected. Please connect your Gmail account first.',
      });
      return;
    }

    // Fetch unread emails from Gmail
    const emails = await gmailService.fetchEmails(userId, {
      maxResults: maxEmails,
      query: 'is:unread',
      labelIds: [labelFilter],
    });

    if (emails.messages.length === 0) {
      res.json({
        success: true,
        data: {
          message: 'No unread emails to process',
          emailsEnqueued: 0,
          jobs: [],
        },
      });
      return;
    }

    // Enqueue jobs for each email with high priority
    const jobIds: string[] = [];
    for (const email of emails.messages) {
      const jobId = `email-${userId}-${email.id}`;

      await addEmailProcessingJob(
        {
          userId,
          messageId: email.id,
          priority: 2, // High priority for user-initiated processing
        },
        2 // Priority level
      );

      jobIds.push(jobId);

      // Store email metadata in database if not already exists
      await db.query(
        `INSERT INTO emails (user_id, message_id, processing_status, created_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (user_id, message_id) DO UPDATE
         SET processing_status = $3`,
        [userId, email.id, 'pending']
      );
    }

    logger.info(`Enqueued ${jobIds.length} email processing jobs for user ${userId}`);

    res.json({
      success: true,
      data: {
        message: `Processing ${emails.messages.length} emails in background`,
        emailsEnqueued: emails.messages.length,
        estimatedTime: `${Math.ceil(emails.messages.length * 8)} seconds`,
        jobs: jobIds,
        trackingUrl: `/api/v1/queue/jobs/user/${userId}`,
      },
    });
  } catch (error: any) {
    logger.error('Error in processInbox controller:', error);
    next(error);
  }
};

/**
 * Auto-process specific emails by filter
 * POST /api/v1/automation/process-filtered
 *
 * Allows processing emails based on custom filters:
 * - From specific sender
 * - With specific subject
 * - With specific labels
 * - Date range
 */
export const processFiltered = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { userId, filter, maxEmails = 50 } = req.body;

    if (!userId || !filter) {
      res.status(400).json({
        success: false,
        error: 'userId and filter are required',
      });
      return;
    }

    logger.info(`Processing filtered emails for user ${userId}`, { filter });

    // Build Gmail query from filter
    const query = buildGmailQuery(filter);

    // Fetch emails matching filter
    const emails = await gmailService.fetchEmails(userId, {
      maxResults: maxEmails,
      query,
    });

    if (emails.messages.length === 0) {
      res.json({
        success: true,
        data: {
          message: 'No emails match the filter',
          emailsEnqueued: 0,
        },
      });
      return;
    }

    // Enqueue jobs
    const jobIds: string[] = [];
    for (const email of emails.messages) {
      const jobId = `email-${userId}-${email.id}`;

      await addEmailProcessingJob(
        {
          userId,
          messageId: email.id,
          priority: 3,
        },
        3
      );

      jobIds.push(jobId);
    }

    res.json({
      success: true,
      data: {
        message: `Processing ${emails.messages.length} filtered emails`,
        emailsEnqueued: emails.messages.length,
        jobs: jobIds,
      },
    });
  } catch (error: any) {
    logger.error('Error in processFiltered controller:', error);
    next(error);
  }
};

/**
 * Enable continuous auto-processing
 * POST /api/v1/automation/enable
 *
 * Subscribes to Gmail push notifications for real-time processing
 */
export const enableAutomation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { userId } = req.body;

    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'userId is required',
      });
      return;
    }

    // Subscribe to Gmail push notifications
    const subscription = await gmailService.subscribeToNotifications(
      userId,
      process.env.GMAIL_PUBSUB_TOPIC || 'projects/tasksnap/topics/gmail-notifications'
    );

    // Update user preferences
    await db.query(
      `INSERT INTO user_preferences (user_id, auto_process_enabled, created_at)
       VALUES ($1, true, NOW())
       ON CONFLICT (user_id) DO UPDATE
       SET auto_process_enabled = true, updated_at = NOW()`,
      [userId]
    );

    logger.info(`Enabled automation for user ${userId}`);

    res.json({
      success: true,
      data: {
        message: 'Automation enabled! New emails will be processed automatically.',
        subscription,
        status: 'active',
      },
    });
  } catch (error: any) {
    logger.error('Error in enableAutomation controller:', error);
    next(error);
  }
};

/**
 * Disable continuous auto-processing
 * POST /api/v1/automation/disable
 */
export const disableAutomation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { userId } = req.body;

    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'userId is required',
      });
      return;
    }

    // Unsubscribe from Gmail push notifications
    await gmailService.unsubscribeFromNotifications(userId);

    // Update user preferences
    await db.query(
      `UPDATE user_preferences
       SET auto_process_enabled = false, updated_at = NOW()
       WHERE user_id = $1`,
      [userId]
    );

    logger.info(`Disabled automation for user ${userId}`);

    res.json({
      success: true,
      data: {
        message: 'Automation disabled. Emails will not be processed automatically.',
        status: 'inactive',
      },
    });
  } catch (error: any) {
    logger.error('Error in disableAutomation controller:', error);
    next(error);
  }
};

/**
 * Get automation status
 * GET /api/v1/automation/status/:userId
 */
export const getAutomationStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { userId } = req.params;

    // Get user preferences
    const prefsResult = await db.query(
      `SELECT auto_process_enabled, created_at, updated_at
       FROM user_preferences
       WHERE user_id = $1`,
      [userId]
    );

    // Get Gmail watch status
    const watchResult = await db.query(
      `SELECT expiration, history_id, created_at
       FROM gmail_watches
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId]
    );

    // Get recent processing stats
    const statsResult = await db.query(
      `SELECT
         COUNT(*) FILTER (WHERE processing_status = 'completed') as completed,
         COUNT(*) FILTER (WHERE processing_status = 'failed') as failed,
         COUNT(*) FILTER (WHERE processing_status = 'pending') as pending,
         COUNT(*) FILTER (WHERE processing_status = 'processing') as processing,
         MAX(processed_at) as last_processed
       FROM emails
       WHERE user_id = $1`,
      [userId]
    );

    const isEnabled = prefsResult.rows.length > 0 && prefsResult.rows[0].auto_process_enabled;
    const hasActiveWatch = watchResult.rows.length > 0 && new Date(watchResult.rows[0].expiration) > new Date();

    res.json({
      success: true,
      data: {
        enabled: isEnabled,
        watchActive: hasActiveWatch,
        watch: watchResult.rows[0] || null,
        stats: statsResult.rows[0],
        preferences: prefsResult.rows[0] || null,
      },
    });
  } catch (error: any) {
    logger.error('Error in getAutomationStatus controller:', error);
    next(error);
  }
};

// Helper function to build Gmail query from filter object
function buildGmailQuery(filter: any): string {
  const parts: string[] = [];

  if (filter.from) parts.push(`from:${filter.from}`);
  if (filter.subject) parts.push(`subject:"${filter.subject}"`);
  if (filter.after) parts.push(`after:${filter.after}`);
  if (filter.before) parts.push(`before:${filter.before}`);
  if (filter.hasAttachment) parts.push('has:attachment');
  if (filter.isUnread) parts.push('is:unread');
  if (filter.label) parts.push(`label:${filter.label}`);

  return parts.join(' ');
}
