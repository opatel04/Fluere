import { query } from '../config/database';
import logger from '../config/logger';
import EmailThreadService from './email-thread.service';
import notificationService from './notification.service';

/**
 * Follow-up Detection Service
 *  emails that need responses and calculates urgency
 */

export interface FollowUp {
  id: string;
  userId: string;
  clientId?: string;
  emailId?: string;
  threadId: string;
  daysSinceClientMessage: number;
  urgencyScore: number;
  clientMessageSnippet?: string;
  suggestedResponse?: string;
  status: 'pending' | 'dismissed' | 'responded';
  dismissedReason?: string;
  respondedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface FollowUpWithDetails extends FollowUp {
  clientName?: string;
  clientEmail?: string;
  subject?: string;
}

class FollowUpService {
  private emailThreadService: EmailThreadService;

  constructor() {
    this.emailThreadService = new EmailThreadService();
  }

  /**
   * Main detection method: Scan for threads that need follow-up
   * This is called by the scheduled job
   */
  async detectAndCreateFollowUps(userId: string, thresholdDays: number = 2): Promise<number> {
    try {
      logger.info(`Starting follow-up detection for user ${userId}`);

      // Get unanswered threads using existing method
      const unansweredThreads = await this.emailThreadService.findUnansweredThreads(
        userId,
        thresholdDays
      );

      if (unansweredThreads.length === 0) {
        logger.info(`No unanswered threads found for user ${userId}`);
        return 0;
      }

      let createdCount = 0;

      for (const thread of unansweredThreads) {
        // Check if follow-up already exists for this thread
        const existingFollowUp = await this.getFollowUpByThread(userId, thread.thread_id);

        if (!existingFollowUp) {
          // Calculate urgency score
          const urgencyScore = this.calculateUrgencyScore({
            daysSinceMessage: thread.days_since_message || 0,
            clientSentiment: null, // Could add sentiment analysis
            hasDeadline: false, // Could check for deadlines in email
            clientValue: 'normal', // Could add client tier
          });

          // Create snippet from email body
          const snippet = this.createSnippet(thread.body);

          // Create follow-up record
          await this.createFollowUp({
            userId,
            clientId: thread.client_id,
            emailId: thread.email_id,
            threadId: thread.thread_id,
            daysSinceClientMessage: Math.floor(thread.days_since_message || 0),
            urgencyScore,
            clientMessageSnippet: snippet,
          });

          createdCount++;
          logger.info(`Created follow-up for thread ${thread.thread_id}, urgency: ${urgencyScore}`);
        }
      }

      logger.info(`Created ${createdCount} new follow-ups for user ${userId}`);
      return createdCount;
    } catch (error) {
      logger.error('Error in detectAndCreateFollowUps:', error);
      throw error;
    }
  }

  /**
   * Calculate urgency score (1-10 scale)
   * Higher score = more urgent
   */
  private calculateUrgencyScore(params: {
    daysSinceMessage: number;
    clientSentiment: 'positive' | 'neutral' | 'negative' | null;
    hasDeadline: boolean;
    clientValue: 'vip' | 'high' | 'normal' | 'low';
  }): number {
    let score = 5; // Base score

    // Days since message (most important factor)
    if (params.daysSinceMessage >= 7) {
      score += 3; // Very overdue
    } else if (params.daysSinceMessage >= 5) {
      score += 2; // Quite overdue
    } else if (params.daysSinceMessage >= 3) {
      score += 1; // Getting overdue
    }

    // Sentiment impact
    if (params.clientSentiment === 'negative') {
      score += 2; // Unhappy client needs attention
    } else if (params.clientSentiment === 'positive') {
      score -= 1; // Can wait a bit longer
    }

    // Deadline urgency
    if (params.hasDeadline) {
      score += 1;
    }

    // Client value
    switch (params.clientValue) {
      case 'vip':
        score += 2;
        break;
      case 'high':
        score += 1;
        break;
      case 'low':
        score -= 1;
        break;
    }

    // Clamp between 1-10
    return Math.max(1, Math.min(10, score));
  }

  /**
   * Create a follow-up record
   */
  private async createFollowUp(data: {
    userId: string;
    clientId?: string;
    emailId?: string;
    threadId: string;
    daysSinceClientMessage: number;
    urgencyScore: number;
    clientMessageSnippet?: string;
    suggestedResponse?: string;
  }): Promise<string> {
    try {
      const result = await query(
        `INSERT INTO follow_ups (
          user_id, client_id, email_id, thread_id,
          days_since_client_message, urgency_score,
          client_message_snippet, suggested_response,
          status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
        RETURNING id`,
        [
          data.userId,
          data.clientId || null,
          data.emailId || null,
          data.threadId,
          data.daysSinceClientMessage,
          data.urgencyScore,
          data.clientMessageSnippet || null,
          data.suggestedResponse || null,
          'pending',
        ]
      );

      return result.rows[0].id;
    } catch (error) {
      logger.error('Error creating follow-up:', error);
      throw error;
    }
  }

  /**
   * Get follow-up by thread (to avoid duplicates)
   */
  private async getFollowUpByThread(userId: string, threadId: string): Promise<FollowUp | null> {
    try {
      const result = await query(
        `SELECT * FROM follow_ups
         WHERE user_id = $1 AND thread_id = $2 AND status = 'pending'
         LIMIT 1`,
        [userId, threadId]
      );

      return result.rows.length > 0 ? this.mapFollowUp(result.rows[0]) : null;
    } catch (error) {
      logger.error('Error getting follow-up by thread:', error);
      return null;
    }
  }

  /**
   * Get all follow-ups for a user
   */
  async getFollowUps(
    userId: string,
    status: 'pending' | 'dismissed' | 'responded' | 'all' = 'pending'
  ): Promise<FollowUpWithDetails[]> {
    try {
      let statusFilter = status !== 'all' ? 'AND f.status = $2' : '';
      const params: any[] = [userId];
      if (status !== 'all') {
        params.push(status);
      }

      const result = await query(
        `SELECT
          f.*,
          c.name as client_name,
          c.email as client_email,
          e.subject
         FROM follow_ups f
         LEFT JOIN clients c ON f.client_id = c.id
         LEFT JOIN emails e ON f.email_id = e.id
         WHERE f.user_id = $1 ${statusFilter}
         ORDER BY f.urgency_score DESC, f.created_at DESC`,
        params
      );

      return result.rows.map((row: any) => ({
        ...this.mapFollowUp(row),
        clientName: row.client_name,
        clientEmail: row.client_email,
        subject: row.subject,
      }));
    } catch (error) {
      logger.error('Error getting follow-ups:', error);
      throw error;
    }
  }

  /**
   * Get urgent follow-ups (urgency score >= 7)
   */
  async getUrgentFollowUps(userId: string): Promise<FollowUpWithDetails[]> {
    try {
      const result = await query(
        `SELECT
          f.*,
          c.name as client_name,
          c.email as client_email,
          e.subject
         FROM follow_ups f
         LEFT JOIN clients c ON f.client_id = c.id
         LEFT JOIN emails e ON f.email_id = e.id
         WHERE f.user_id = $1 AND f.status = 'pending' AND f.urgency_score >= 7
         ORDER BY f.urgency_score DESC, f.created_at ASC`,
        [userId]
      );

      return result.rows.map((row: any) => ({
        ...this.mapFollowUp(row),
        clientName: row.client_name,
        clientEmail: row.client_email,
        subject: row.subject,
      }));
    } catch (error) {
      logger.error('Error getting urgent follow-ups:', error);
      throw error;
    }
  }

  /**
   * Get follow-up by ID
   */
  async getFollowUpById(userId: string, followUpId: string): Promise<FollowUpWithDetails | null> {
    try {
      const result = await query(
        `SELECT
          f.*,
          c.name as client_name,
          c.email as client_email,
          e.subject,
          e.body
         FROM follow_ups f
         LEFT JOIN clients c ON f.client_id = c.id
         LEFT JOIN emails e ON f.email_id = e.id
         WHERE f.id = $1 AND f.user_id = $2`,
        [followUpId, userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return {
        ...this.mapFollowUp(result.rows[0]),
        clientName: result.rows[0].client_name,
        clientEmail: result.rows[0].client_email,
        subject: result.rows[0].subject,
      };
    } catch (error) {
      logger.error('Error getting follow-up by ID:', error);
      throw error;
    }
  }

  /**
   * Dismiss a follow-up
   */
  async dismissFollowUp(
    userId: string,
    followUpId: string,
    reason?: string
  ): Promise<boolean> {
    try {
      const result = await query(
        `UPDATE follow_ups
         SET status = 'dismissed',
             dismissed_reason = $3,
             updated_at = NOW()
         WHERE id = $1 AND user_id = $2 AND status = 'pending'`,
        [followUpId, userId, reason || null]
      );

      return result.rowCount > 0;
    } catch (error) {
      logger.error('Error dismissing follow-up:', error);
      throw error;
    }
  }

  /**
   * Mark follow-up as responded (usually called when user sends reply)
   */
  async markAsResponded(userId: string, threadId: string): Promise<boolean> {
    try {
      const result = await query(
        `UPDATE follow_ups
         SET status = 'responded',
             responded_at = NOW(),
             updated_at = NOW()
         WHERE user_id = $1 AND thread_id = $2 AND status = 'pending'`,
        [userId, threadId]
      );

      if (result.rowCount > 0) {
        logger.info(`Marked follow-up for thread ${threadId} as responded`);
      }

      return result.rowCount > 0;
    } catch (error) {
      logger.error('Error marking follow-up as responded:', error);
      throw error;
    }
  }

  /**
   * Get follow-up statistics for user
   */
  async getFollowUpStats(userId: string): Promise<{
    total: number;
    pending: number;
    urgent: number;
    responded: number;
    dismissed: number;
    avgUrgencyScore: number;
  }> {
    try {
      const result = await query(
        `SELECT
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
          COUNT(CASE WHEN status = 'pending' AND urgency_score >= 7 THEN 1 END) as urgent,
          COUNT(CASE WHEN status = 'responded' THEN 1 END) as responded,
          COUNT(CASE WHEN status = 'dismissed' THEN 1 END) as dismissed,
          AVG(CASE WHEN status = 'pending' THEN urgency_score END) as avg_urgency_score
         FROM follow_ups
         WHERE user_id = $1`,
        [userId]
      );

      const stats = result.rows[0];
      return {
        total: parseInt(stats.total) || 0,
        pending: parseInt(stats.pending) || 0,
        urgent: parseInt(stats.urgent) || 0,
        responded: parseInt(stats.responded) || 0,
        dismissed: parseInt(stats.dismissed) || 0,
        avgUrgencyScore: parseFloat(stats.avg_urgency_score) || 0,
      };
    } catch (error) {
      logger.error('Error getting follow-up stats:', error);
      throw error;
    }
  }

  /**
   * Send follow-up notifications to user
   */
  async sendFollowUpNotifications(userId: string): Promise<void> {
    try {
      const urgentFollowUps = await this.getUrgentFollowUps(userId);

      if (urgentFollowUps.length === 0) {
        logger.info(`No urgent follow-ups to notify for user ${userId}`);
        return;
      }

      // Get user info
      const userResult = await query('SELECT email, name FROM users WHERE id = $1', [userId]);
      if (userResult.rows.length === 0) {
        logger.error(`User ${userId} not found`);
        return;
      }

      const user = userResult.rows[0];

      // TODO: Send notification email
      logger.info(`Would send ${urgentFollowUps.length} urgent follow-up notifications to ${user.email}`);

      // Could integrate with notification service here
      // await notificationService.sendEmail({...})
    } catch (error) {
      logger.error('Error sending follow-up notifications:', error);
      throw error;
    }
  }

  /**
   * Create snippet from email body (first 200 chars)
   */
  private createSnippet(text: string | null): string {
    if (!text) return '';

    // Clean HTML tags if present
    const cleaned = text.replace(/<[^>]*>/g, '').trim();

    // Take first 200 characters
    if (cleaned.length <= 200) {
      return cleaned;
    }

    return cleaned.substring(0, 200) + '...';
  }

  /**
   * Map database row to FollowUp interface
   */
  private mapFollowUp(row: any): FollowUp {
    return {
      id: row.id,
      userId: row.user_id,
      clientId: row.client_id,
      emailId: row.email_id,
      threadId: row.thread_id,
      daysSinceClientMessage: row.days_since_client_message,
      urgencyScore: row.urgency_score,
      clientMessageSnippet: row.client_message_snippet,
      suggestedResponse: row.suggested_response,
      status: row.status,
      dismissedReason: row.dismissed_reason,
      respondedAt: row.responded_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export default FollowUpService;
