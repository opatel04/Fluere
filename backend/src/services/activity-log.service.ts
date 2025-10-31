import { query } from '../config/database';
import logger from '../config/logger';

export interface ActivityLogData {
  userId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  resourceName?: string;
  actionStatus?: 'success' | 'failed' | 'pending';
  actionDetails?: Record<string, any>;
  errorMessage?: string;
  ipAddress?: string;
  userAgent?: string;
  durationMs?: number;
}

export interface ActivityLogFilter {
  userId?: string;
  action?: string;
  resourceType?: string;
  actionStatus?: 'success' | 'failed' | 'pending';
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface ActivityLogStats {
  totalActions: number;
  successfulActions: number;
  failedActions: number;
  averageDurationMs: number;
  actionBreakdown: { action: string; count: number }[];
}

class ActivityLogService {
  /**
   * Log a user or system activity
   */
  async logActivity(data: ActivityLogData): Promise<string> {
    try {
      const sql = `
        INSERT INTO activity_logs (
          user_id,
          action,
          resource_type,
          resource_id,
          resource_name,
          action_status,
          action_details,
          error_message,
          ip_address,
          user_agent,
          duration_ms
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id
      `;

      const values = [
        data.userId || null,
        data.action,
        data.resourceType,
        data.resourceId || null,
        data.resourceName || null,
        data.actionStatus || 'success',
        data.actionDetails ? JSON.stringify(data.actionDetails) : null,
        data.errorMessage || null,
        data.ipAddress || null,
        data.userAgent || null,
        data.durationMs || null,
      ];

      const result = await query(sql, values);
      const logId = result.rows[0].id;

      logger.debug('Activity logged', {
        logId,
        action: data.action,
        resourceType: data.resourceType,
      });

      return logId;
    } catch (error) {
      logger.error('Failed to log activity:', error);
      // Don't throw - logging shouldn't break the main application flow
      return '';
    }
  }

  /**
   * Get activity logs with filters
   */
  async getActivities(filter: ActivityLogFilter = {}): Promise<any[]> {
    try {
      let sql = `
        SELECT
          id,
          user_id,
          action,
          resource_type,
          resource_id,
          resource_name,
          action_status,
          action_details,
          error_message,
          ip_address,
          user_agent,
          duration_ms,
          created_at
        FROM activity_logs
        WHERE 1=1
      `;

      const params: any[] = [];
      let paramCount = 1;

      if (filter.userId) {
        sql += ` AND user_id = $${paramCount++}`;
        params.push(filter.userId);
      }

      if (filter.action) {
        sql += ` AND action = $${paramCount++}`;
        params.push(filter.action);
      }

      if (filter.resourceType) {
        sql += ` AND resource_type = $${paramCount++}`;
        params.push(filter.resourceType);
      }

      if (filter.actionStatus) {
        sql += ` AND action_status = $${paramCount++}`;
        params.push(filter.actionStatus);
      }

      if (filter.startDate) {
        sql += ` AND created_at >= $${paramCount++}`;
        params.push(filter.startDate);
      }

      if (filter.endDate) {
        sql += ` AND created_at <= $${paramCount++}`;
        params.push(filter.endDate);
      }

      sql += ` ORDER BY created_at DESC`;

      if (filter.limit) {
        sql += ` LIMIT $${paramCount++}`;
        params.push(filter.limit);
      }

      if (filter.offset) {
        sql += ` OFFSET $${paramCount++}`;
        params.push(filter.offset);
      }

      const result = await query(sql, params);
      return result.rows;
    } catch (error) {
      logger.error('Failed to get activities:', error);
      throw error;
    }
  }

  /**
   * Get activity log statistics for a user
   */
  async getUserStats(userId: string, days: number = 30): Promise<ActivityLogStats> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get overall stats
      const statsQuery = `
        SELECT
          COUNT(*) as total_actions,
          COUNT(*) FILTER (WHERE action_status = 'success') as successful_actions,
          COUNT(*) FILTER (WHERE action_status = 'failed') as failed_actions,
          AVG(duration_ms) as average_duration_ms
        FROM activity_logs
        WHERE user_id = $1 AND created_at >= $2
      `;

      const statsResult = await query(statsQuery, [userId, startDate]);
      const stats = statsResult.rows[0];

      // Get action breakdown
      const breakdownQuery = `
        SELECT
          action,
          COUNT(*) as count
        FROM activity_logs
        WHERE user_id = $1 AND created_at >= $2
        GROUP BY action
        ORDER BY count DESC
        LIMIT 10
      `;

      const breakdownResult = await query(breakdownQuery, [userId, startDate]);

      return {
        totalActions: parseInt(stats.total_actions),
        successfulActions: parseInt(stats.successful_actions),
        failedActions: parseInt(stats.failed_actions),
        averageDurationMs: Math.round(parseFloat(stats.average_duration_ms) || 0),
        actionBreakdown: breakdownResult.rows,
      };
    } catch (error) {
      logger.error('Failed to get user stats:', error);
      throw error;
    }
  }

  /**
   * Get recent failed activities for debugging
   */
  async getRecentFailures(userId?: string, limit: number = 10): Promise<any[]> {
    try {
      let sql = `
        SELECT
          id,
          user_id,
          action,
          resource_type,
          resource_id,
          resource_name,
          error_message,
          action_details,
          created_at
        FROM activity_logs
        WHERE action_status = 'failed'
      `;

      const params: any[] = [];

      if (userId) {
        sql += ` AND user_id = $1`;
        params.push(userId);
      }

      sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
      params.push(limit);

      const result = await query(sql, params);
      return result.rows;
    } catch (error) {
      logger.error('Failed to get recent failures:', error);
      throw error;
    }
  }

  /**
   * Clean up old activity logs (for data retention compliance)
   */
  async cleanupOldLogs(retentionDays: number = 90): Promise<number> {
    try {
      const sql = `SELECT cleanup_old_activity_logs($1)`;
      const result = await query(sql, [retentionDays]);
      const deletedCount = result.rows[0].cleanup_old_activity_logs;

      logger.info('Cleaned up old activity logs', { deletedCount, retentionDays });
      return deletedCount;
    } catch (error) {
      logger.error('Failed to cleanup old logs:', error);
      throw error;
    }
  }

  /**
   * Helper: Create activity log from Express request
   */
  async logFromRequest(
    req: any,
    action: string,
    resourceType: string,
    resourceId?: string,
    resourceName?: string,
    additionalDetails?: Record<string, any>
  ): Promise<string> {
    const userId = req.user?.id || req.userId;
    const ipAddress = req.ip || req.connection?.remoteAddress;
    const userAgent = req.headers['user-agent'];

    return this.logActivity({
      userId,
      action,
      resourceType,
      resourceId,
      resourceName,
      ipAddress,
      userAgent,
      actionDetails: additionalDetails,
    });
  }

  /**
   * Helper: Create activity log with timing
   */
  async logWithTiming<T>(
    data: Omit<ActivityLogData, 'durationMs'>,
    fn: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();

    try {
      const result = await fn();
      const durationMs = Date.now() - startTime;

      await this.logActivity({
        ...data,
        actionStatus: 'success',
        durationMs,
      });

      return result;
    } catch (error: any) {
      const durationMs = Date.now() - startTime;

      await this.logActivity({
        ...data,
        actionStatus: 'failed',
        errorMessage: error.message || 'Unknown error',
        durationMs,
      });

      throw error;
    }
  }
}

// Export singleton instance
export const activityLogService = new ActivityLogService();
export default activityLogService;
