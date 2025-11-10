import { Request, Response } from 'express';
import activityLogService, { ActivityLogFilter } from '../services/activity-log.service';
import { asyncHandler } from '../middleware/errorHandler';
import { UnauthorizedError } from '../types/errors';

/**
 * Get activity logs for the authenticated user
 */
export const getUserActivities = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).user?.id || (req as any).userId;

  if (!userId) {
    throw new UnauthorizedError();
  }

  const filter: ActivityLogFilter = {
    userId,
    action: req.query.action as string,
    resourceType: req.query.resourceType as string,
    actionStatus: req.query.status as any,
    limit: parseInt(req.query.limit as string) || 50,
    offset: parseInt(req.query.offset as string) || 0,
  };

  // Parse date filters if provided
  if (req.query.startDate) {
    filter.startDate = new Date(req.query.startDate as string);
  }
  if (req.query.endDate) {
    filter.endDate = new Date(req.query.endDate as string);
  }

  const activities = await activityLogService.getActivities(filter);

  res.json({
    success: true,
    count: activities.length,
    activities,
  });
});

/**
 * Get activity statistics for the authenticated user
 */
export const getUserActivityStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).user?.id || (req as any).userId;

  if (!userId) {
    throw new UnauthorizedError();
  }

  const days = parseInt(req.query.days as string) || 30;
  const stats = await activityLogService.getUserStats(userId, days);

  res.json({
    success: true,
    period: `${days} days`,
    stats,
  });
});

/**
 * Get recent failed activities for debugging
 */
export const getRecentFailures = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).user?.id || (req as any).userId;

  if (!userId) {
    throw new UnauthorizedError();
  }

  const limit = parseInt(req.query.limit as string) || 10;
  const failures = await activityLogService.getRecentFailures(userId, limit);

  res.json({
    success: true,
    count: failures.length,
    failures,
  });
});

/**
 * Get activity timeline (recent activities with grouping)
 */
export const getActivityTimeline = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).user?.id || (req as any).userId;

  if (!userId) {
    throw new UnauthorizedError();
  }

  const limit = parseInt(req.query.limit as string) || 20;
  const activities = await activityLogService.getActivities({
    userId,
    limit,
  });

  // Group activities by date
  const timeline: Record<string, any[]> = {};
  activities.forEach((activity) => {
    const date = new Date(activity.created_at).toISOString().split('T')[0];
    if (!timeline[date]) {
      timeline[date] = [];
    }
    timeline[date].push(activity);
  });

  res.json({
    success: true,
    timeline,
  });
});
