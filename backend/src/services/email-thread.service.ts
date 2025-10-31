import { query } from '../config/database';
import logger from '../config/logger';

/**
 * Email Thread Service
 * Tracks email conversation threads, identifies replies, and manages thread history
 */

export interface EmailThread {
  threadId: string;
  userId: string;
  clientId?: string;
  subject: string;
  messageCount: number;
  lastMessageAt: Date;
  lastSenderType: 'client' | 'user';
  createdAt: Date;
}

export interface ThreadMessage {
  id: string;
  threadId: string;
  messageId: string;
  inReplyTo?: string;
  fromEmail: string;
  isFromUser: boolean;
  subject: string;
  receivedAt: Date;
  sentiment?: string;
}

class EmailThreadService {
  /**
   * Create or update a thread when processing an email
   */
  async processEmailThread(emailData: {
    userId: string;
    emailId: string;
    threadId?: string;
    messageId: string;
    inReplyTo?: string;
    references?: string[];
    subject: string;
    fromEmail: string;
    clientId?: string;
    receivedAt: Date;
  }): Promise<string> {
    try {
      const {
        userId,
        emailId,
        threadId,
        messageId,
        inReplyTo,
        references = [],
        subject,
        fromEmail,
        clientId,
        receivedAt,
      } = emailData;

      // Determine if this is a reply or new thread
      const isReply = !!(inReplyTo || (references && references.length > 0));

      // Find or create thread
      let actualThreadId: string = threadId || '';

      if (isReply && (inReplyTo || references.length > 0)) {
        // Try to find existing thread by in_reply_to or references
        const foundThreadId = await this.findThreadByReferences(inReplyTo, references);
        if (foundThreadId) {
          actualThreadId = foundThreadId;
        }
      }

      if (!actualThreadId) {
        // Create new thread
        actualThreadId = messageId; // Use first message ID as thread ID
      }

      // Check if user is the sender
      const isFromUser = await this.isUserEmail(userId, fromEmail);

      // Update email record with thread info
      await query(
        `UPDATE emails
         SET thread_id = $1, in_reply_to = $2, references = $3, is_reply = $4
         WHERE id = $5`,
        [actualThreadId, inReplyTo || null, references, isReply, emailId]
      );

      // Update thread reply count
      if (isReply) {
        await this.incrementThreadReplyCount(actualThreadId);
      }

      logger.info(`Processed email thread: ${actualThreadId}, isReply: ${isReply}`);

      return actualThreadId;
    } catch (error) {
      logger.error('Error in processEmailThread:', error);
      throw error;
    }
  }

  /**
   * Find thread by checking in_reply_to and references
   */
  private async findThreadByReferences(
    inReplyTo?: string,
    references: string[] = []
  ): Promise<string | null> {
    try {
      // First try to find by in_reply_to
      if (inReplyTo) {
        const result = await query(
          `SELECT thread_id FROM emails WHERE message_id = $1 OR gmail_id = $1 LIMIT 1`,
          [inReplyTo]
        );

        if (result.rows.length > 0) {
          return result.rows[0].thread_id;
        }
      }

      // Try to find by any of the references
      if (references.length > 0) {
        const result = await query(
          `SELECT thread_id FROM emails
           WHERE message_id = ANY($1) OR gmail_id = ANY($1)
           ORDER BY received_at DESC
           LIMIT 1`,
          [references]
        );

        if (result.rows.length > 0) {
          return result.rows[0].thread_id;
        }
      }

      return null;
    } catch (error) {
      logger.error('Error in findThreadByReferences:', error);
      return null;
    }
  }

  /**
   * Get all emails in a thread, ordered by date
   */
  async getThreadHistory(threadId: string, userId: string): Promise<ThreadMessage[]> {
    try {
      const result = await query(
        `SELECT
          e.id,
          e.thread_id,
          e.message_id,
          e.in_reply_to,
          e.sender_email as from_email,
          e.subject,
          e.received_at,
          e.sentiment,
          CASE
            WHEN u.email = e.sender_email THEN true
            ELSE false
          END as is_from_user
         FROM emails e
         LEFT JOIN users u ON u.id = e.user_id
         WHERE e.thread_id = $1 AND e.user_id = $2
         ORDER BY e.received_at ASC`,
        [threadId, userId]
      );

      return result.rows.map((row: any) => ({
        id: row.id,
        threadId: row.thread_id,
        messageId: row.message_id,
        inReplyTo: row.in_reply_to,
        fromEmail: row.from_email,
        isFromUser: row.is_from_user,
        subject: row.subject,
        receivedAt: row.received_at,
        sentiment: row.sentiment,
      }));
    } catch (error) {
      logger.error('Error in getThreadHistory:', error);
      throw error;
    }
  }

  /**
   * Check if user was the last responder in a thread
   * This is used for follow-up detection
   */
  async isUserLastResponder(threadId: string, userId: string): Promise<boolean> {
    try {
      const result = await query(
        `SELECT
          e.sender_email,
          u.email as user_email
         FROM emails e
         JOIN users u ON u.id = e.user_id
         WHERE e.thread_id = $1 AND e.user_id = $2
         ORDER BY e.received_at DESC
         LIMIT 1`,
        [threadId, userId]
      );

      if (result.rows.length === 0) {
        return false;
      }

      const row = result.rows[0];
      return row.sender_email === row.user_email;
    } catch (error) {
      logger.error('Error in isUserLastResponder:', error);
      return false;
    }
  }

  /**
   * Get the last message from client in a thread
   * Used to determine if follow-up is needed
   */
  async getLastClientMessage(threadId: string, userId: string): Promise<any | null> {
    try {
      const result = await query(
        `SELECT
          e.*,
          u.email as user_email
         FROM emails e
         JOIN users u ON u.id = e.user_id
         WHERE e.thread_id = $1 AND e.user_id = $2 AND e.sender_email != u.email
         ORDER BY e.received_at DESC
         LIMIT 1`,
        [threadId, userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Error in getLastClientMessage:', error);
      return null;
    }
  }

  /**
   * Get thread statistics
   */
  async getThreadStats(threadId: string, userId: string): Promise<any> {
    try {
      const result = await query(
        `SELECT
          COUNT(*) as total_messages,
          COUNT(CASE WHEN e.sender_email = u.email THEN 1 END) as user_messages,
          COUNT(CASE WHEN e.sender_email != u.email THEN 1 END) as client_messages,
          MIN(e.received_at) as first_message_at,
          MAX(e.received_at) as last_message_at,
          AVG(e.sentiment_score) as avg_sentiment
         FROM emails e
         JOIN users u ON u.id = e.user_id
         WHERE e.thread_id = $1 AND e.user_id = $2`,
        [threadId, userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const stats = result.rows[0];

      // Calculate average response time
      const responseTimeResult = await query(
        `WITH message_pairs AS (
          SELECT
            e1.received_at as client_message_time,
            e2.received_at as user_response_time,
            EXTRACT(EPOCH FROM (e2.received_at - e1.received_at)) / 3600 as response_hours
          FROM emails e1
          JOIN users u ON u.id = e1.user_id
          LEFT JOIN LATERAL (
            SELECT received_at
            FROM emails e2
            WHERE e2.thread_id = e1.thread_id
            AND e2.received_at > e1.received_at
            AND e2.sender_email = u.email
            ORDER BY e2.received_at ASC
            LIMIT 1
          ) e2 ON true
          WHERE e1.thread_id = $1
          AND e1.user_id = $2
          AND e1.sender_email != u.email
          AND e2.received_at IS NOT NULL
        )
        SELECT AVG(response_hours) as avg_response_hours
        FROM message_pairs`,
        [threadId, userId]
      );

      return {
        ...stats,
        avgResponseHours: responseTimeResult.rows[0]?.avg_response_hours || null,
      };
    } catch (error) {
      logger.error('Error in getThreadStats:', error);
      throw error;
    }
  }

  /**
   * Increment reply count for a thread
   */
  private async incrementThreadReplyCount(threadId: string): Promise<void> {
    try {
      await query(
        `UPDATE emails
         SET reply_count = reply_count + 1
         WHERE thread_id = $1`,
        [threadId]
      );
    } catch (error) {
      logger.error('Error in incrementThreadReplyCount:', error);
      // Don't throw - this is not critical
    }
  }

  /**
   * Check if an email address belongs to the user
   */
  private async isUserEmail(userId: string, email: string): Promise<boolean> {
    try {
      const result = await query(
        `SELECT id FROM users WHERE id = $1 AND email = $2`,
        [userId, email]
      );

      return result.rows.length > 0;
    } catch (error) {
      logger.error('Error in isUserEmail:', error);
      return false;
    }
  }

  /**
   * Find unanswered threads (client sent last message, user hasn't responded)
   */
  async findUnansweredThreads(
    userId: string,
    thresholdDays: number = 2
  ): Promise<any[]> {
    try {
      const result = await query(
        `WITH last_messages AS (
          SELECT DISTINCT ON (e.thread_id)
            e.thread_id,
            e.id as email_id,
            e.sender_email,
            e.received_at,
            e.subject,
            e.body,
            e.client_id,
            u.email as user_email,
            c.name as client_name,
            c.email as client_email
          FROM emails e
          JOIN users u ON u.id = e.user_id
          LEFT JOIN clients c ON e.client_id = c.id
          WHERE e.user_id = $1
          AND e.thread_id IS NOT NULL
          ORDER BY e.thread_id, e.received_at DESC
        )
        SELECT *,
          EXTRACT(DAY FROM (NOW() - received_at)) as days_since_message
        FROM last_messages
        WHERE sender_email != user_email
        AND received_at < NOW() - ($2 || ' days')::INTERVAL
        ORDER BY received_at ASC`,
        [userId, thresholdDays]
      );

      return result.rows;
    } catch (error) {
      logger.error('Error in findUnansweredThreads:', error);
      throw error;
    }
  }

  /**
   * Mark thread as responded
   * This is used when user responds to a follow-up
   */
  async markThreadAsResponded(threadId: string, userId: string): Promise<void> {
    try {
      // This is handled automatically when new emails are processed
      // But we can also manually mark follow-ups as responded
      await query(
        `UPDATE follow_ups
         SET status = 'responded', responded_at = NOW(), updated_at = NOW()
         WHERE thread_id = $1 AND user_id = $2 AND status = 'pending'`,
        [threadId, userId]
      );

      logger.info(`Marked thread ${threadId} as responded`);
    } catch (error) {
      logger.error('Error in markThreadAsResponded:', error);
      throw error;
    }
  }
}

export default EmailThreadService;
