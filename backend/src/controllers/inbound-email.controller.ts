import { Request, Response } from 'express';
import InboundEmailService from '../services/inbound-email.service';
import logger from '../config/logger';
import { asyncHandler } from '../middleware/errorHandler';
import { successResponse, successWithCount, createdResponse, listResponse } from '../utils/responses';
import { ValidationError, UnauthorizedError, NotFoundError } from '../types/errors';

/**
 * Inbound Email Controller
 * Handles webhook requests from Resend/SendGrid for forwarded emails
 */

const inboundEmailService = new InboundEmailService();

/**
 * Webhook endpoint to receive inbound emails
 * POST /api/v1/email/inbound
 *
 * This endpoint receives emails forwarded to task@tasksnap.com (or similar)
 * and processes them asynchronously
 *
 * Note: Always returns 200 to acknowledge webhook receipt
 */
export const receiveInboundEmail = asyncHandler(async (
  req: Request,
  res: Response
): Promise<void> => {
  // Immediately return 200 to webhook provider
  res.status(200).json({ success: true, message: 'Email received' });

  // Process email asynchronously (don't await)
  setImmediate(async () => {
    try {
      const emailData = req.body;

      logger.info('Received inbound email webhook:', {
        from: emailData.from,
        to: emailData.to,
        subject: emailData.subject,
      });

      // Identify user from recipient email address
      const userId = await inboundEmailService.identifyUserFromEmail(emailData.to);

      if (!userId) {
        logger.error(`Could not identify user from email: ${emailData.to}`);
        return;
      }

      // Process the email
      const result = await inboundEmailService.processInboundEmail(emailData, userId);

      if (result.success) {
        logger.info('Inbound email processed successfully:', result);
      } else {
        logger.error('Inbound email processing failed:', result.error);
      }
    } catch (error) {
      logger.error('Error in async email processing:', error);
    }
  });
});

/**
 * Manual processing endpoint for testing
 * POST /api/v1/email/inbound/process
 * Requires authentication
 */
export const processInboundEmailManual = asyncHandler(async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = req.userId || req.body.userId;

  if (!userId) {
    throw new ValidationError('User ID is required');
  }

  const emailData = req.body.email;

  if (!emailData) {
    throw new ValidationError('Email data is required');
  }

  const result = await inboundEmailService.processInboundEmail(emailData, userId);

  successResponse(res, result);
});

/**
 * Get inbound email by ID
 * GET /api/v1/email/inbound/:id
 */
export const getInboundEmail = asyncHandler(async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  const userId = req.userId;

  if (!userId) {
    throw new UnauthorizedError();
  }

  const { query } = require('../config/database');

  const result = await query(
    `SELECT
      ie.*,
      c.name as client_name,
      c.email as client_email,
      t.title as task_title,
      t.status as task_status
    FROM inbound_emails ie
    LEFT JOIN clients c ON ie.client_id = c.id
    LEFT JOIN tasks t ON ie.task_id = t.id
    WHERE ie.id = $1 AND ie.user_id = $2`,
    [id, userId]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Inbound email', id);
  }

  successResponse(res, result.rows[0]);
});

/**
 * List inbound emails for a user
 * GET /api/v1/email/inbound
 */
export const listInboundEmails = asyncHandler(async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = req.userId;

  if (!userId) {
    throw new UnauthorizedError();
  }

  const { status, limit = 50, offset = 0 } = req.query;
  const { query } = require('../config/database');

  let sql = `
    SELECT
      ie.id,
      ie.from_email,
      ie.from_name,
      ie.subject,
      ie.processing_status,
      ie.created_at,
      ie.processed_at,
      c.name as client_name,
      c.email as client_email,
      t.title as task_title
    FROM inbound_emails ie
    LEFT JOIN clients c ON ie.client_id = c.id
    LEFT JOIN tasks t ON ie.task_id = t.id
    WHERE ie.user_id = $1
  `;

  const params: any[] = [userId];

  if (status) {
    sql += ` AND ie.processing_status = $${params.length + 1}`;
    params.push(status);
  }

  sql += ` ORDER BY ie.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(parseInt(limit as string), parseInt(offset as string));

  const result = await query(sql, params);

  // Get total count
  const countResult = await query(
    `SELECT COUNT(*) as total FROM inbound_emails WHERE user_id = $1${
      status ? ' AND processing_status = $2' : ''
    }`,
    status ? [userId, status] : [userId]
  );

  successResponse(res, {
    emails: result.rows,
    total: parseInt(countResult.rows[0].total),
    limit: parseInt(limit as string),
    offset: parseInt(offset as string),
  });
});

/**
 * Retry processing a failed inbound email
 * POST /api/v1/email/inbound/:id/retry
 */
export const retryInboundEmail = asyncHandler(async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  const userId = req.userId;

  if (!userId) {
    throw new UnauthorizedError();
  }

  const { query } = require('../config/database');

  // Get the inbound email
  const result = await query(
    `SELECT * FROM inbound_emails WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Inbound email', id);
  }

  const inboundEmail = result.rows[0];

  if (inboundEmail.processing_status === 'completed') {
    throw new ValidationError('Email already processed successfully');
  }

  // Reset status to pending
  await query(
    `UPDATE inbound_emails SET processing_status = 'pending', error_message = NULL, updated_at = NOW() WHERE id = $1`,
    [id]
  );

  // Reprocess the email
  const emailData = JSON.parse(inboundEmail.raw_data);
  const processResult = await inboundEmailService.processInboundEmail(emailData, userId);

  successResponse(res, processResult);
});

export default {
  receiveInboundEmail,
  processInboundEmailManual,
  getInboundEmail,
  listInboundEmails,
  retryInboundEmail,
};
