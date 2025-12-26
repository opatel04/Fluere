import { query } from '../config/database';
import logger from '../config/logger';
import activityLogService from './activity-log.service';

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  created_at: Date;
  updated_at: Date;
}

export interface UserUpdateData {
  email?: string;
  name?: string;
}

export interface UserExportData {
  profile: UserProfile;
  clients: any[];
  tasks: any[];
  emails: any[];
  trelloCards: any[];
  activityLogs: any[];
  preferences: any;
  stats: {
    totalTasks: number;
    completedTasks: number;
    totalClients: number;
    totalEmails: number;
    accountAge: number;
  };
}

class UserService {
  /**
   * Get user profile by ID
   */
  async getProfile(userId: string): Promise<UserProfile | null> {
    try {
      const sql = `
        SELECT id, email, name, created_at, updated_at
        FROM users
        WHERE id = $1
      `;

      const result = await query(sql, [userId]);

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Failed to get user profile:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, data: UserUpdateData): Promise<UserProfile> {
    try {
      const updates: string[] = [];
      const values: any[] = [userId];
      let paramCount = 2;

      if (data.email !== undefined) {
        updates.push(`email = $${paramCount++}`);
        values.push(data.email);
      }

      if (data.name !== undefined) {
        updates.push(`name = $${paramCount++}`);
        values.push(data.name);
      }

      updates.push(`updated_at = NOW()`);

      const sql = `
        UPDATE users
        SET ${updates.join(', ')}
        WHERE id = $1
        RETURNING id, email, name, created_at, updated_at
      `;

      const result = await query(sql, values);

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      // Log the activity
      await activityLogService.logActivity({
        userId,
        action: 'profile_updated',
        resourceType: 'user',
        resourceId: userId,
        actionDetails: { updates: Object.keys(data) },
      });

      logger.info(`User profile updated: ${userId}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to update user profile:', error);
      throw error;
    }
  }

  /**
   * Export all user data (GDPR compliance)
   */
  async exportUserData(userId: string): Promise<UserExportData> {
    try {
      // Get user profile
      const profile = await this.getProfile(userId);
      if (!profile) {
        throw new Error('User not found');
      }

      // Get all user data from various tables
      const [
        clients,
        tasks,
        emails,
        trelloCards,
        activityLogs,
        preferences,
      ] = await Promise.all([
        this.getUserClients(userId),
        this.getUserTasks(userId),
        this.getUserEmails(userId),
        this.getUserTrelloCards(userId),
        this.getUserActivityLogs(userId),
        this.getUserPreferences(userId),
      ]);

      // Calculate stats
      const accountAge = Math.floor(
        (new Date().getTime() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24)
      );

      const stats = {
        totalTasks: tasks.length,
        completedTasks: tasks.filter((t: any) => t.status === 'completed').length,
        totalClients: clients.length,
        totalEmails: emails.length,
        accountAge,
      };

      // Log the export activity
      await activityLogService.logActivity({
        userId,
        action: 'data_exported',
        resourceType: 'user',
        resourceId: userId,
        actionDetails: { recordCount: tasks.length + emails.length + clients.length },
      });

      return {
        profile,
        clients,
        tasks,
        emails,
        trelloCards,
        activityLogs,
        preferences,
        stats,
      };
    } catch (error) {
      logger.error('Failed to export user data:', error);
      throw error;
    }
  }

  /**
   * Delete user account and all associated data (GDPR compliance)
   */
  async deleteAccount(userId: string): Promise<{ deletedRecords: Record<string, number> }> {
    try {
      const deletedRecords: Record<string, number> = {};

      // Log the deletion attempt before deletion
      await activityLogService.logActivity({
        userId,
        action: 'account_deletion_initiated',
        resourceType: 'user',
        resourceId: userId,
      });

      // Delete from all tables (in reverse order of dependencies)
      // The CASCADE constraints will handle most deletions, but we'll count them

      // Count records before deletion
      const tables = [
        'activity_logs',
        'trello_cards',
        'follow_ups',
        'tasks',
        'inbound_emails',
        'emails',
        'client_sentiment_history',
        'clients',
        'user_preferences',
        'gmail_tokens',
      ];

      for (const table of tables) {
        try {
          const countResult = await query(
            `SELECT COUNT(*) FROM ${table} WHERE user_id = $1`,
            [userId]
          );
          deletedRecords[table] = parseInt(countResult.rows[0].count);

          // Delete records
          await query(`DELETE FROM ${table} WHERE user_id = $1`, [userId]);
        } catch (error) {
          logger.warn(`Failed to delete from ${table}:`, error);
          deletedRecords[table] = 0;
        }
      }

      // Finally, delete the user
      const userResult = await query('DELETE FROM users WHERE id = $1 RETURNING id', [userId]);
      deletedRecords['users'] = userResult.rows.length;

      logger.info(`User account deleted: ${userId}`, { deletedRecords });

      return { deletedRecords };
    } catch (error) {
      logger.error('Failed to delete user account:', error);
      throw error;
    }
  }

  // Helper methods to fetch user data

  private async getUserClients(userId: string): Promise<any[]> {
    const sql = 'SELECT * FROM clients WHERE user_id = $1 ORDER BY created_at DESC';
    const result = await query(sql, [userId]);
    return result.rows;
  }

  private async getUserTasks(userId: string): Promise<any[]> {
    const sql = 'SELECT * FROM tasks WHERE user_id = $1 ORDER BY created_at DESC';
    const result = await query(sql, [userId]);
    return result.rows;
  }

  private async getUserEmails(userId: string): Promise<any[]> {
    const sql = 'SELECT * FROM emails WHERE user_id = $1 ORDER BY received_at DESC LIMIT 1000';
    const result = await query(sql, [userId]);
    return result.rows;
  }

  private async getUserTrelloCards(userId: string): Promise<any[]> {
    const sql = 'SELECT * FROM trello_cards WHERE user_id = $1 ORDER BY created_at DESC';
    const result = await query(sql, [userId]);
    return result.rows;
  }

  private async getUserActivityLogs(userId: string): Promise<any[]> {
    const sql = 'SELECT * FROM activity_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1000';
    const result = await query(sql, [userId]);
    return result.rows;
  }

  private async getUserPreferences(userId: string): Promise<any> {
    const sql = 'SELECT * FROM user_preferences WHERE user_id = $1';
    const result = await query(sql, [userId]);
    return result.rows[0] || null;
  }

  /**
   * Get user notification preferences
   */
  async getPreferences(userId: string): Promise<any> {
    try {
      let preferences = await this.getUserPreferences(userId);

      // Create default preferences if they don't exist
      if (!preferences) {
        const sql = `
          INSERT INTO user_preferences (user_id)
          VALUES ($1)
          RETURNING *
        `;
        const result = await query(sql, [userId]);
        preferences = result.rows[0];
      }

      return preferences;
    } catch (error) {
      logger.error('Failed to get user preferences:', error);
      throw error;
    }
  }

  /**
   * Update user notification preferences
   */
  async updatePreferences(userId: string, data: any): Promise<any> {
    try {
      // Get or create preferences first
      let preferences = await this.getUserPreferences(userId);

      if (!preferences) {
        const sql = `
          INSERT INTO user_preferences (user_id)
          VALUES ($1)
          RETURNING *
        `;
        const result = await query(sql, [userId]);
        preferences = result.rows[0];
      }

      // Build update query dynamically
      const updates: string[] = [];
      const values: any[] = [userId];
      let paramCount = 2;

      const allowedFields = [
        'daily_summary_enabled',
        'daily_summary_time',
        'daily_summary_timezone',
        'weekly_report_enabled',
        'follow_up_notifications_enabled',
        'follow_up_threshold_days',
        'sentiment_analysis_enabled',
        'auto_process_emails',
        'notification_enabled',
      ];

      for (const field of allowedFields) {
        if (data[field] !== undefined) {
          updates.push(`${field} = $${paramCount++}`);
          values.push(data[field]);
        }
      }

      if (updates.length === 0) {
        return preferences;
      }

      updates.push(`updated_at = NOW()`);

      const sql = `
        UPDATE user_preferences
        SET ${updates.join(', ')}
        WHERE user_id = $1
        RETURNING *
      `;

      const result = await query(sql, values);

      // Log the activity
      await activityLogService.logActivity({
        userId,
        action: 'preferences_updated',
        resourceType: 'user_preferences',
        resourceId: userId,
        actionDetails: { updates: Object.keys(data) },
      });

      logger.info(`User preferences updated: ${userId}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to update user preferences:', error);
      throw error;
    }
  }

  /**
   * Send test daily summary email (force=true to bypass duplicate check)
   */
  async sendTestDailySummary(userId: string): Promise<void> {
    try {
      const SummaryService = (await import('./summary.service')).default;
      const summaryService = new SummaryService();
      await summaryService.generateDailySummary(userId, true); // force=true
      logger.info(`Test daily summary sent for user ${userId}`);
    } catch (error) {
      logger.error('Failed to send test daily summary:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const userService = new UserService();
export default userService;
