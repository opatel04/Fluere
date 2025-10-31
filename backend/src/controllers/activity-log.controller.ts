import { Request, Response } from 'express';
import activityLogService, { ActivityLogFilter } from '../services/activity-log.service';
import logger from '../config/logger';

/**
 * Get activity logs for the authenticated user
 */
export const getUserActivities = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id || (req as any).userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
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
  } catch (error) {
    logger.error('Error fetching user activities:', error);
    res.status(500).json({
      error: 'Failed to fetch activities',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Get activity statistics for the authenticated user
 */
export const getUserActivityStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id || (req as any).userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const days = parseInt(req.query.days as string) || 30;
    const stats = await activityLogService.getUserStats(userId, days);

    res.json({
      success: true,
      period: `${days} days`,
      stats,
    });
  } catch (error) {
    logger.error('Error fetching activity stats:', error);
    res.status(500).json({
      error: 'Failed to fetch activity statistics',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Get recent failed activities for debugging
 */
export const getRecentFailures = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id || (req as any).userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const limit = parseInt(req.query.limit as string) || 10;
    const failures = await activityLogService.getRecentFailures(userId, limit);

    res.json({
      success: true,
      count: failures.length,
      failures,
    });
  } catch (error) {
    logger.error('Error fetching recent failures:', error);
    res.status(500).json({
      error: 'Failed to fetch recent failures',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Get activity timeline (recent activities with grouping)
 */
export const getActivityTimeline = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id || (req as any).userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
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
  } catch (error) {
    logger.error('Error fetching activity timeline:', error);
    res.status(500).json({
      error: 'Failed to fetch activity timeline',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
