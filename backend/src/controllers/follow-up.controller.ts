import { Request, Response } from 'express';
import FollowUpService from '../services/follow-up.service';
import { FollowUpStatus, ValidationMessages, ApiMessages } from '../config/constants';
import { asyncHandler } from '../middleware/errorHandler';
import { ValidationError, NotFoundError } from '../types/errors';

const followUpService = new FollowUpService();

/**
 * Get all follow-ups for authenticated user
 * GET /api/v1/follow-ups?status=pending|dismissed|responded|all
 */
export const getFollowUps = asyncHandler(async (req: Request, res: Response): Promise<any> => {
  // userId is guaranteed by extractUserId middleware
  const userId = (req as any).userId;
  const status = (req.query.status as any) || FollowUpStatus.PENDING;
  const validStatuses = [...Object.values(FollowUpStatus), 'all'];

  if (!validStatuses.includes(status)) {
    throw new ValidationError(ValidationMessages.INVALID_STATUS);
  }

  const followUps = await followUpService.getFollowUps(userId, status);

  res.json({
    success: true,
    count: followUps.length,
    data: followUps,
  });
});

/**
 * Get urgent follow-ups (urgency >= 7)
 * GET /api/v1/follow-ups/urgent
 */
export const getUrgentFollowUps = asyncHandler(async (req: Request, res: Response): Promise<any> => {
  // userId is guaranteed by extractUserId middleware
  const userId = (req as any).userId;
  const urgentFollowUps = await followUpService.getUrgentFollowUps(userId);

  res.json({
    success: true,
    count: urgentFollowUps.length,
    data: urgentFollowUps,
  });
});

/**
 * Get follow-up by ID
 * GET /api/v1/follow-ups/:id
 */
export const getFollowUpById = asyncHandler(async (req: Request, res: Response): Promise<any> => {
  // userId is guaranteed by extractUserId middleware
  const userId = (req as any).userId;
  const { id } = req.params;
  const followUp = await followUpService.getFollowUpById(userId, id);

  if (!followUp) {
    throw new NotFoundError('Follow-up', id);
  }

  res.json({
    success: true,
    data: followUp,
  });
});

/**
 * Get follow-up statistics
 * GET /api/v1/follow-ups/stats
 */
export const getFollowUpStats = asyncHandler(async (req: Request, res: Response): Promise<any> => {
  // userId is guaranteed by extractUserId middleware
  const userId = (req as any).userId;
  const stats = await followUpService.getFollowUpStats(userId);

  res.json({
    success: true,
    data: stats,
  });
});

/**
 * Dismiss a follow-up
 * POST /api/v1/follow-ups/:id/dismiss
 */
export const dismissFollowUp = asyncHandler(async (req: Request, res: Response): Promise<any> => {
  // userId is guaranteed by extractUserId middleware
  const userId = (req as any).userId;
  const { id } = req.params;
  const { reason } = req.body;

  const dismissed = await followUpService.dismissFollowUp(userId, id, reason);

  if (!dismissed) {
    throw new NotFoundError('Follow-up', id);
  }

  res.json({
    success: true,
    message: ApiMessages.FOLLOWUP_DISMISSED,
  });
});

/**
 * Mark follow-up as responded
 * POST /api/v1/follow-ups/:id/respond
 */
export const markFollowUpResponded = asyncHandler(async (req: Request, res: Response): Promise<any> => {
  // userId is guaranteed by extractUserId middleware
  const userId = (req as any).userId;
  const { id } = req.params;

  // Get follow-up to get thread_id
  const followUp = await followUpService.getFollowUpById(userId, id);
  if (!followUp) {
    throw new NotFoundError('Follow-up', id);
  }

  const marked = await followUpService.markAsResponded(userId, followUp.threadId);

  if (!marked) {
    throw new ValidationError('Failed to mark follow-up as responded');
  }

  res.json({
    success: true,
    message: ApiMessages.FOLLOWUP_RESPONDED,
  });
});

/**
 * Trigger manual follow-up detection
 * POST /api/v1/follow-ups/detect
 */
export const detectFollowUps = asyncHandler(async (req: Request, res: Response): Promise<any> => {
  // userId is guaranteed by extractUserId middleware
  const userId = (req as any).userId;
  const { thresholdDays } = req.body;
  const threshold = thresholdDays ? parseInt(thresholdDays) : 2;

  if (isNaN(threshold) || threshold < 1) {
    throw new ValidationError(ValidationMessages.INVALID_THRESHOLD);
  }

  const createdCount = await followUpService.detectAndCreateFollowUps(userId, threshold);

  res.json({
    success: true,
    message: `Detected ${createdCount} new follow-ups`,
    data: {
      createdCount,
      thresholdDays: threshold,
    },
  });
});
