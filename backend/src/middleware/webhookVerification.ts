import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import config from '../config/env';
import logger from '../config/logger';

/**
 * Middleware to verify Trello webhook signatures
 * Trello uses HMAC-SHA1 with the webhook callback URL + request body
 */
export const verifyTrelloWebhook = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const signature = req.headers['x-trello-webhook'] as string;

    if (!signature) {
      logger.warn('Trello webhook missing signature header');
      res.status(401).json({ error: 'Missing webhook signature' });
      return;
    }

    // Get the raw body (Express needs to be configured with express.json({ verify: ... }) to save raw body)
    const body = JSON.stringify(req.body);
    const callbackUrl = `${config.trello.callbackUrl}/webhook`;

    // Trello signature: base64(HMAC-SHA1(body + callbackUrl, secret))
    const content = body + callbackUrl;
    const expectedSignature = crypto
      .createHmac('sha1', config.trello.apiSecret)
      .update(content, 'utf8')
      .digest('base64');

    if (signature !== expectedSignature) {
      logger.warn('Trello webhook signature verification failed', {
        expected: expectedSignature,
        received: signature,
      });
      res.status(401).json({ error: 'Invalid webhook signature' });
      return;
    }

    logger.debug('Trello webhook signature verified successfully');
    next();
  } catch (error) {
    logger.error('Error verifying Trello webhook signature:', error);
    res.status(500).json({ error: 'Webhook verification failed' });
  }
};

/**
 * Middleware to verify Gmail push notification authenticity
 * Gmail doesn't use traditional signatures, but we can verify:
 * 1. The message format matches Google's Pub/Sub format
 * 2. The token matches what we set during subscription (if applicable)
 */
export const verifyGmailWebhook = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Gmail push notifications come in Pub/Sub format
    const { message } = req.body;

    if (!message) {
      logger.warn('Gmail webhook missing message field');
      res.status(400).json({ error: 'Invalid Gmail push notification format' });
      return;
    }

    // Verify message structure
    if (!message.data || !message.messageId) {
      logger.warn('Gmail webhook has invalid message structure');
      res.status(400).json({ error: 'Invalid message structure' });
      return;
    }

    // Decode the base64 data
    try {
      const decodedData = Buffer.from(message.data, 'base64').toString('utf-8');
      const data = JSON.parse(decodedData);

      // Verify it contains expected Gmail fields
      if (!data.emailAddress || !data.historyId) {
        logger.warn('Gmail webhook missing required fields in decoded data');
        res.status(400).json({ error: 'Invalid Gmail notification data' });
        return;
      }

      // Store decoded data for use in controller
      req.body.decodedData = data;
    } catch (decodeError) {
      logger.error('Failed to decode Gmail webhook data:', decodeError);
      res.status(400).json({ error: 'Failed to decode notification data' });
      return;
    }

    // Additional verification: Check if the notification is not too old (prevent replay attacks)
    if (message.publishTime) {
      const publishTime = new Date(message.publishTime);
      const now = new Date();
      const ageMinutes = (now.getTime() - publishTime.getTime()) / (1000 * 60);

      // Reject notifications older than 10 minutes
      if (ageMinutes > 10) {
        logger.warn('Gmail webhook notification too old', { ageMinutes });
        res.status(400).json({ error: 'Notification expired' });
        return;
      }
    }

    logger.debug('Gmail webhook verified successfully');
    next();
  } catch (error) {
    logger.error('Error verifying Gmail webhook:', error);
    res.status(500).json({ error: 'Webhook verification failed' });
  }
};

/**
 * Generic webhook rate limiter to prevent webhook flooding
 * More restrictive than API rate limiting
 */
export const webhookRateLimiter = (maxRequests: number = 100, windowMs: number = 60000) => {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction): void => {
    // Use IP or a combination of IP and webhook type as key
    const key = `${req.ip}-${req.path}`;
    const now = Date.now();

    const record = requests.get(key);

    if (!record || now > record.resetTime) {
      // First request or window expired, create new record
      requests.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });
      next();
      return;
    }

    if (record.count >= maxRequests) {
      logger.warn('Webhook rate limit exceeded', { ip: req.ip, path: req.path });
      res.status(429).json({ error: 'Too many webhook requests' });
      return;
    }

    // Increment count
    record.count++;
    next();
  };
};

/**
 * Middleware to log all webhook requests for monitoring
 */
export const webhookLogger = (webhookType: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    logger.info('Webhook received', {
      type: webhookType,
      ip: req.ip,
      path: req.path,
      headers: {
        userAgent: req.headers['user-agent'],
        contentType: req.headers['content-type'],
      },
      bodySize: JSON.stringify(req.body).length,
    });
    next();
  };
};
