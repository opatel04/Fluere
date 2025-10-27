import { Request, Response, NextFunction } from 'express';
import gmailService from '../services/gmail.service';
import logger from '../config/logger';

/**
 * Gmail Authentication Controller
 * Handles Gmail OAuth flow and email operations
 */

/**
 * Initiate Gmail OAuth flow
 * GET /api/v1/auth/gmail/connect
 */
export const connectGmail = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // In production, get userId from authenticated session
    // For now, we'll use a query parameter or generate a temp ID
    const userId = req.query.userId as string || (req as any).session?.userId || 'temp_user_id';

    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'User ID is required',
      });
      return;
    }

    const authUrl = gmailService.getAuthUrl(userId);

    res.json({
      success: true,
      data: {
        authUrl,
        message: 'Please visit the URL to authorize Gmail access',
      },
    });
  } catch (error) {
    logger.error('Error in connectGmail controller:', error);
    next(error);
  }
};

/**
 * Handle Gmail OAuth callback
 * GET /api/v1/auth/gmail/callback
 */
export const gmailCallback = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
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

    // Exchange code for tokens
    const tokens = await gmailService.getTokensFromCode(code);

    // Save tokens to database
    await gmailService.saveTokens(userId, tokens);

    logger.info(`Gmail connected successfully for user ${userId}`);

    // Redirect back to OAuth dashboard with success
    res.redirect('/oauth-dashboard.html?gmail=success');
  } catch (error) {
    logger.error('Error in gmailCallback controller:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.redirect(`/oauth-dashboard.html?gmail=error&message=${encodeURIComponent(errorMessage)}`);
  }
};

/**
 * Disconnect Gmail account
 * POST /api/v1/auth/gmail/disconnect
 */
export const disconnectGmail = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.body.userId || (req as any).session?.userId;

    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'User ID is required',
      });
      return;
    }

    await gmailService.disconnect(userId);

    res.json({
      success: true,
      data: {
        message: 'Gmail disconnected successfully',
      },
    });
  } catch (error) {
    logger.error('Error in disconnectGmail controller:', error);
    next(error);
  }
};

/**
 * Get Gmail connection status
 * GET /api/v1/auth/gmail/status
 */
export const getGmailStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.query.userId as string || (req as any).session?.userId;

    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'User ID is required',
      });
      return;
    }

    const isConnected = await gmailService.isConnected(userId);

    res.json({
      success: true,
      data: {
        connected: isConnected,
        service: 'gmail',
      },
    });
  } catch (error) {
    logger.error('Error in getGmailStatus controller:', error);
    next(error);
  }
};

/**
 * Fetch emails from Gmail
 * GET /api/v1/emails/fetch
 */
export const fetchEmails = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.query.userId as string || (req as any).session?.userId;

    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'User ID is required',
      });
      return;
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

    res.json({
      success: true,
      data: {
        emails: parsedEmails,
        nextPageToken: result.nextPageToken,
        count: parsedEmails.length,
      },
    });
  } catch (error) {
    logger.error('Error in fetchEmails controller:', error);
    next(error);
  }
};

/**
 * Subscribe to Gmail push notifications
 * POST /api/v1/emails/subscribe
 */
export const subscribeToNotifications = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.body.userId || (req as any).session?.userId;
    const topicName = req.body.topicName;

    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'User ID is required',
      });
      return;
    }

    if (!topicName) {
      res.status(400).json({
        success: false,
        error: 'Pub/Sub topic name is required',
      });
      return;
    }

    await gmailService.subscribeToNotifications(userId, topicName);

    res.json({
      success: true,
      data: {
        message: 'Subscribed to Gmail notifications successfully',
      },
    });
  } catch (error) {
    logger.error('Error in subscribeToNotifications controller:', error);
    next(error);
  }
};

/**
 * Unsubscribe from Gmail push notifications
 * POST /api/v1/emails/unsubscribe
 */
export const unsubscribeFromNotifications = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.body.userId || (req as any).session?.userId;

    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'User ID is required',
      });
      return;
    }

    await gmailService.unsubscribeFromNotifications(userId);

    res.json({
      success: true,
      data: {
        message: 'Unsubscribed from Gmail notifications successfully',
      },
    });
  } catch (error) {
    logger.error('Error in unsubscribeFromNotifications controller:', error);
    next(error);
  }
};

/**
 * Handle Gmail webhook notifications
 * POST /api/v1/emails/webhook
 */
export const handleWebhook = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Gmail sends push notifications as Pub/Sub messages
    const message = req.body.message;

    if (!message || !message.data) {
      res.status(400).json({
        success: false,
        error: 'Invalid webhook payload',
      });
      return;
    }

    // Decode the Pub/Sub message
    const data = JSON.parse(Buffer.from(message.data, 'base64').toString());
    const { emailAddress, historyId } = data;

    logger.info(`Received Gmail webhook for ${emailAddress}, historyId: ${historyId}`);

    // TODO: Process new emails in background job
    // This would typically:
    // 1. Get user by email address
    // 2. Fetch history since last historyId
    // 3. Process new messages
    // 4. Extract tasks and create Trello cards

    // Acknowledge receipt immediately
    res.status(200).json({
      success: true,
      data: {
        message: 'Webhook received',
      },
    });
  } catch (error) {
    logger.error('Error in handleWebhook controller:', error);
    // Still return 200 to acknowledge receipt
    res.status(200).json({
      success: false,
      error: 'Webhook processing error',
    });
  }
};

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
  res: Response,
  _next: NextFunction
): Promise<void> => {
  res.status(403).json({
    success: false,
    error: 'This feature is disabled. Marking emails as read requires gmail.modify permission, which is not currently enabled for security reasons.',
    hint: 'To enable this feature, add gmail.modify scope in gmail.service.ts',
  });
};
