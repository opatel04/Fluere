import { Request, Response } from 'express';
import gmailService from '../services/gmail.service';
import db from '../config/database';
import { asyncHandler } from '../middleware/errorHandler';
import { successResponse, successWithCount, createdResponse, listResponse } from '../utils/responses';
import { ValidationError } from '../types/errors';

/**
 * Gmail Authentication Controller
 * Handles Gmail OAuth flow and email operations
 */

/**
 * Initiate Gmail OAuth flow
 * GET /api/v1/auth/gmail/connect
 */
export const connectGmail = asyncHandler(async (
  req: Request,
  res: Response
): Promise<void> => {
  // In production, get userId from authenticated session
  // For now, we'll use a query parameter or generate a temp ID
  const userId = req.query.userId as string || (req as any).session?.userId || 'temp_user_id';

  if (!userId) {
    throw new ValidationError('User ID is required');
  }

  const authUrl = gmailService.getAuthUrl(userId);

  successResponse(res, {
    authUrl,
    message: 'Please visit the URL to authorize Gmail access',
  });
});

/**
 * Handle Gmail OAuth callback
 * GET /api/v1/auth/gmail/callback
 *
 * Note: Uses redirects instead of JSON responses for OAuth flow
 */
export const gmailCallback = asyncHandler(async (
  req: Request,
  res: Response
): Promise<void> => {
  const { code, state, error } = req.query;

  // Handle OAuth errors
  if (error) {
    res.redirect(`/oauth-dashboard.html?gmail=error&message=${encodeURIComponent(`OAuth error: ${error}`)}`);
    return;
  }

  if (!code || typeof code !== 'string') {
    res.redirect('/oauth-dashboard.html?gmail=error&message=Authorization%20code%20missing');
    return;
  }

  // State contains the user ID
  const userId = state as string;

  if (!userId) {
    res.redirect('/oauth-dashboard.html?gmail=error&message=Invalid%20state%20parameter');
    return;
  }

  // Exchange code for tokens and save to database
  // Note: If this fails, asyncHandler will catch and the error handler will respond with JSON
  // In a production OAuth flow, you might want a custom error handler that redirects
  const tokens = await gmailService.getTokensFromCode(code);
  await gmailService.saveTokens(userId, tokens);

  // Redirect back to OAuth dashboard with success
  res.redirect('/oauth-dashboard.html?gmail=success');
});

/**
 * Disconnect Gmail account
 * POST /api/v1/auth/gmail/disconnect
 */
export const disconnectGmail = asyncHandler(async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = req.body.userId || (req as any).session?.userId;

  if (!userId) {
    throw new ValidationError('User ID is required');
  }

  await gmailService.disconnect(userId);

  successResponse(res, {
    message: 'Gmail disconnected successfully',
  });
});

/**
 * Get Gmail connection status
 * GET /api/v1/auth/gmail/status
 */
export const getGmailStatus = asyncHandler(async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = req.query.userId as string || (req as any).session?.userId;

  if (!userId) {
    throw new ValidationError('User ID is required');
  }

  const isConnected = await gmailService.isConnected(userId);

  successResponse(res, {
    connected: isConnected,
    service: 'gmail',
  });
});

/**
 * Fetch emails from Gmail
 * GET /api/v1/emails/fetch
 */
export const fetchEmails = asyncHandler(async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = req.query.userId as string || (req as any).session?.userId;

  if (!userId) {
    throw new ValidationError('User ID is required');
  }

  const maxResults = parseInt(req.query.maxResults as string) || 10;
  const query = req.query.query as string;
  const labelIds = req.query.labelIds
    ? (req.query.labelIds as string).split(',')
    : undefined;
  const pageToken = req.query.pageToken as string;

  const result = await gmailService.fetchEmails(userId, {
    maxResults,
    query,
    labelIds,
    pageToken,
  });

  // Parse emails
  const parsedEmails = result.messages.map((msg) =>
    gmailService.parseEmail(msg)
  );

  successResponse(res, {
    emails: parsedEmails,
    nextPageToken: result.nextPageToken,
    count: parsedEmails.length,
  });
});

/**
 * Subscribe to Gmail push notifications
 * POST /api/v1/emails/subscribe
 */
export const subscribeToNotifications = asyncHandler(async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = req.body.userId || (req as any).session?.userId;
  const topicName = req.body.topicName;

  if (!userId) {
    throw new ValidationError('User ID is required');
  }

  if (!topicName) {
    throw new ValidationError('Pub/Sub topic name is required');
  }

  await gmailService.subscribeToNotifications(userId, topicName);

  successResponse(res, {
    message: 'Subscribed to Gmail notifications successfully',
  });
});

/**
 * Unsubscribe from Gmail push notifications
 * POST /api/v1/emails/unsubscribe
 */
export const unsubscribeFromNotifications = asyncHandler(async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = req.body.userId || (req as any).session?.userId;

  if (!userId) {
    throw new ValidationError('User ID is required');
  }

  await gmailService.unsubscribeFromNotifications(userId);

  successResponse(res, {
    message: 'Unsubscribed from Gmail notifications successfully',
  });
});

/**
 * Handle Gmail webhook notifications
 * POST /api/v1/emails/webhook
 *
 * Note: Always returns 200 to acknowledge Pub/Sub receipt
 */
export const handleWebhook = asyncHandler(async (
  req: Request,
  res: Response
): Promise<void> => {
  // Wrap in try-catch to ensure we always return 200 for Pub/Sub acknowledgment
  try {
    // Gmail sends push notifications as Pub/Sub messages
    const message = req.body.message;

    if (!message || !message.data) {
      throw new ValidationError('Invalid webhook payload');
    }

    // Decode the Pub/Sub message
    const data = JSON.parse(Buffer.from(message.data, 'base64').toString());
    const { emailAddress, historyId } = data;

    // Get user by email address
    const userResult = await db.query(
      `SELECT u.id
       FROM users u
       JOIN gmail_tokens gt ON u.id = gt.user_id
       WHERE gt.email = $1`,
      [emailAddress]
    );

    if (userResult.rows.length === 0) {
      successResponse(res, { message: 'No user found for email address' });
      return;
    }

    const userId = userResult.rows[0].id;

    // Get history since last historyId to find new messages
    const historyRecords = await gmailService.getHistory(userId, historyId);

    // Collect all new messages from history records
    const newMessageIds: string[] = [];
    for (const record of historyRecords) {
      if (record.messagesAdded && record.messagesAdded.length > 0) {
        for (const messageData of record.messagesAdded) {
          newMessageIds.push(messageData.message.id);
        }
      }
    }

    if (newMessageIds.length > 0) {
      // Enqueue jobs for each new message
      const { addEmailProcessingJob } = await import('../config/queue');

      for (const messageId of newMessageIds) {
        await addEmailProcessingJob({
          userId,
          messageId,
          historyId,
          priority: 3, // Higher priority for webhook-triggered emails
        }, 3);
      }

      successResponse(res, {
        message: 'Webhook received and jobs enqueued',
        messagesEnqueued: newMessageIds.length,
      });
    } else {
      successResponse(res, { message: 'No new messages to process' });
    }
  } catch (error) {
    // Always return 200 to acknowledge receipt (Pub/Sub requirement)
    successResponse(res, {}, error instanceof Error ? error.message : 'Webhook processing error');
  }
});

/**
 * Mark email as read
 * POST /api/v1/emails/:messageId/read
 *
 * DISABLED: Requires gmail.modify scope
 * This endpoint is disabled because it requires gmail.modify permission.
 * Currently using gmail.readonly for better security.
 */
export const markAsRead = async (
  _req: Request,
  res: Response
): Promise<void> => {
  res.status(403).json({
    success: false,
    error: 'This feature is disabled. Marking emails as read requires gmail.modify permission, which is not currently enabled for security reasons.',
    hint: 'To enable this feature, add gmail.modify scope in gmail.service.ts',
  });
};
