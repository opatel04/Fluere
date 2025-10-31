import { query, transaction } from '../config/database';
import logger from '../config/logger';

/**
 * Client Service
 * Manages freelancer clients - auto-detection, tracking, health scoring, and analytics
 */

export interface Client {
  id: string;
  userId: string;
  email: string;
  name?: string;
  company?: string;
  phone?: string;
  emailCount: number;
  firstContactDate: Date;
  lastContactDate: Date;
  status: 'active' | 'at_risk' | 'churned';
  healthScore: number;
  healthUpdatedAt?: Date;
  notes?: string;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClientFilters {
  status?: 'active' | 'at_risk' | 'churned';
  minHealthScore?: number;
  maxHealthScore?: number;
  searchQuery?: string;
  sortBy?: 'name' | 'last_contact' | 'health_score' | 'email_count';
  sortOrder?: 'asc' | 'desc';
}

export interface ClientStats {
  overview: {
    totalTasks: number;
    completedTasks: number;
    overdueTasks: number;
    pendingTasks: number;
    totalEmails: number;
    healthScore: number;
  };
  communication: {
    avgResponseTime: number; // in hours
    lastContactDate: Date | null;
    emailFrequency: number; // emails per week
    sentimentTrend: Array<{ date: Date; score: number }>;
  };
  tasks: {
    upcomingDeadlines: Array<any>;
    tasksByStatus: { [key: string]: number };
    completionRate: number;
  };
}

class ClientService {
  /**
   * Find or create a client by email
   * This is called automatically when processing inbound emails
   */
  async findOrCreateClient(
    userId: string,
    clientEmail: string,
    clientName?: string
  ): Promise<string> {
    try {
      // Check if client exists
      const existing = await query(
        `SELECT id FROM clients WHERE user_id = $1 AND email = $2`,
        [userId, clientEmail]
      );

      if (existing.rows.length > 0) {
        // Update last contact date and email count
        await this.updateClientActivity(existing.rows[0].id);
        return existing.rows[0].id;
      }

      // Create new client
      const result = await query(
        `INSERT INTO clients (
          user_id, email, name, first_contact_date, last_contact_date,
          email_count, status, health_score, created_at, updated_at
        ) VALUES ($1, $2, $3, NOW(), NOW(), 1, 'active', 100, NOW(), NOW())
        RETURNING id`,
        [userId, clientEmail, clientName || this.extractNameFromEmail(clientEmail)]
      );

      logger.info(`Created new client: ${clientEmail} for user: ${userId}`);

      return result.rows[0].id;
    } catch (error) {
      logger.error('Error in findOrCreateClient:', error);
      throw error;
    }
  }

  /**
   * Get client by email
   */
  async getClientByEmail(userId: string, email: string): Promise<Client | null> {
    try {
      const result = await query(
        `SELECT * FROM clients WHERE user_id = $1 AND email = $2`,
        [userId, email]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToClient(result.rows[0]);
    } catch (error) {
      logger.error('Error in getClientByEmail:', error);
      throw error;
    }
  }

  /**
   * Get client by ID
   */
  async getClientById(clientId: string, userId: string): Promise<Client | null> {
    try {
      const result = await query(
        `SELECT * FROM clients WHERE id = $1 AND user_id = $2`,
        [clientId, userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToClient(result.rows[0]);
    } catch (error) {
      logger.error('Error in getClientById:', error);
      throw error;
    }
  }

  /**
   * Update client activity (increment email count, update last contact)
   */
  async updateClientActivity(clientId: string): Promise<void> {
    try {
      await query(
        `UPDATE clients
         SET last_contact_date = NOW(),
             email_count = email_count + 1,
             updated_at = NOW()
         WHERE id = $1`,
        [clientId]
      );

      // Recalculate health score after activity update
      await this.updateClientHealthScore(clientId);
    } catch (error) {
      logger.error('Error in updateClientActivity:', error);
      throw error;
    }
  }

  /**
   * List all clients for a user with optional filters
   */
  async listClients(userId: string, filters: ClientFilters = {}): Promise<any[]> {
    try {
      const {
        status,
        minHealthScore,
        maxHealthScore,
        searchQuery,
        sortBy = 'last_contact',
        sortOrder = 'desc',
      } = filters;

      let sql = `
        SELECT
          c.*,
          COUNT(DISTINCT t.id) as task_count,
          COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END) as completed_task_count,
          COUNT(DISTINCT CASE WHEN t.is_overdue = true THEN t.id END) as overdue_task_count,
          MAX(t.due_date) as next_deadline
        FROM clients c
        LEFT JOIN tasks t ON t.client_id = c.id
        WHERE c.user_id = $1
      `;

      const params: any[] = [userId];
      let paramIndex = 2;

      // Apply filters
      if (status) {
        sql += ` AND c.status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      if (minHealthScore !== undefined) {
        sql += ` AND c.health_score >= $${paramIndex}`;
        params.push(minHealthScore);
        paramIndex++;
      }

      if (maxHealthScore !== undefined) {
        sql += ` AND c.health_score <= $${paramIndex}`;
        params.push(maxHealthScore);
        paramIndex++;
      }

      if (searchQuery) {
        sql += ` AND (c.name ILIKE $${paramIndex} OR c.email ILIKE $${paramIndex} OR c.company ILIKE $${paramIndex})`;
        params.push(`%${searchQuery}%`);
        paramIndex++;
      }

      sql += ` GROUP BY c.id`;

      // Apply sorting
      const sortColumn = {
        name: 'c.name',
        last_contact: 'c.last_contact_date',
        health_score: 'c.health_score',
        email_count: 'c.email_count',
      }[sortBy] || 'c.last_contact_date';

      sql += ` ORDER BY ${sortColumn} ${sortOrder.toUpperCase()}`;

      const result = await query(sql, params);

      return result.rows;
    } catch (error) {
      logger.error('Error in listClients:', error);
      throw error;
    }
  }

  /**
   * Get detailed client information with tasks, emails, and timeline
   */
  async getClientDetails(clientId: string, userId: string): Promise<any> {
    try {
      // Get client info
      const client = await this.getClientById(clientId, userId);
      if (!client) {
        throw new Error('Client not found');
      }

      // Get tasks
      const tasksResult = await query(
        `SELECT * FROM tasks
         WHERE client_id = $1
         ORDER BY created_at DESC
         LIMIT 50`,
        [clientId]
      );

      // Get emails
      const emailsResult = await query(
        `SELECT * FROM emails
         WHERE client_id = $1
         ORDER BY received_at DESC
         LIMIT 50`,
        [clientId]
      );

      // Get activity timeline
      const activityResult = await query(
        `SELECT * FROM activity_logs
         WHERE resource_type = 'client' AND resource_id = $1
         ORDER BY created_at DESC
         LIMIT 100`,
        [clientId]
      );

      // Get client stats
      const stats = await this.getClientStats(clientId);

      return {
        client,
        tasks: tasksResult.rows,
        emails: emailsResult.rows,
        activity: activityResult.rows,
        stats,
      };
    } catch (error) {
      logger.error('Error in getClientDetails:', error);
      throw error;
    }
  }

  /**
   * Update client information
   */
  async updateClient(
    clientId: string,
    userId: string,
    updates: Partial<Client>
  ): Promise<Client> {
    try {
      const allowedFields = ['name', 'company', 'phone', 'status', 'notes', 'metadata'];
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key)) {
          updateFields.push(`${this.camelToSnake(key)} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      }

      if (updateFields.length === 0) {
        throw new Error('No valid fields to update');
      }

      values.push(clientId, userId);

      const sql = `
        UPDATE clients
        SET ${updateFields.join(', ')}, updated_at = NOW()
        WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
        RETURNING *
      `;

      const result = await query(sql, values);

      if (result.rows.length === 0) {
        throw new Error('Client not found or unauthorized');
      }

      logger.info(`Updated client ${clientId}`);

      return this.mapRowToClient(result.rows[0]);
    } catch (error) {
      logger.error('Error in updateClient:', error);
      throw error;
    }
  }

  /**
   * Archive (soft delete) a client
   */
  async archiveClient(clientId: string, userId: string): Promise<void> {
    try {
      await query(
        `UPDATE clients
         SET status = 'churned', updated_at = NOW()
         WHERE id = $1 AND user_id = $2`,
        [clientId, userId]
      );

      logger.info(`Archived client ${clientId}`);
    } catch (error) {
      logger.error('Error in archiveClient:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive client statistics
   */
  async getClientStats(clientId: string): Promise<ClientStats> {
    try {
      // Use the database function we created
      const statsResult = await query(
        `SELECT * FROM get_client_stats($1)`,
        [clientId]
      );

      const dbStats = statsResult.rows[0];

      // Get upcoming deadlines
      const deadlinesResult = await query(
        `SELECT * FROM tasks
         WHERE client_id = $1
         AND due_date IS NOT NULL
         AND due_date > NOW()
         AND status NOT IN ('completed', 'cancelled')
         ORDER BY due_date ASC
         LIMIT 5`,
        [clientId]
      );

      // Get sentiment trend (last 30 days)
      const sentimentResult = await query(
        `SELECT date, avg_sentiment_score as score
         FROM client_sentiment_history
         WHERE client_id = $1
         AND date >= NOW() - INTERVAL '30 days'
         ORDER BY date ASC`,
        [clientId]
      );

      // Calculate email frequency (emails per week)
      const frequencyResult = await query(
        `SELECT
          CAST(COUNT(*) AS FLOAT) / NULLIF(EXTRACT(EPOCH FROM (MAX(received_at) - MIN(received_at))) / 604800, 0) as frequency
         FROM emails
         WHERE client_id = $1
         AND received_at >= NOW() - INTERVAL '90 days'`,
        [clientId]
      );

      // Calculate average response time
      const responseTimeResult = await query(
        `SELECT
          AVG(EXTRACT(EPOCH FROM (response.received_at - client_email.received_at)) / 3600) as avg_hours
         FROM emails client_email
         LEFT JOIN emails response ON response.thread_id = client_email.thread_id
           AND response.received_at > client_email.received_at
           AND response.email_type = 'outbound'
         WHERE client_email.client_id = $1
         AND client_email.email_type = 'inbound'
         AND response.id IS NOT NULL`,
        [clientId]
      );

      // Get last contact date
      const lastContactResult = await query(
        `SELECT MAX(last_contact_date) as last_contact FROM clients WHERE id = $1`,
        [clientId]
      );

      // Calculate task completion rate
      const completionRate = dbStats.total_tasks > 0
        ? (dbStats.completed_tasks / dbStats.total_tasks) * 100
        : 0;

      return {
        overview: {
          totalTasks: dbStats.total_tasks || 0,
          completedTasks: dbStats.completed_tasks || 0,
          overdueTasks: dbStats.overdue_tasks || 0,
          pendingTasks: dbStats.pending_tasks || 0,
          totalEmails: dbStats.total_emails || 0,
          healthScore: dbStats.avg_sentiment || 100,
        },
        communication: {
          avgResponseTime: responseTimeResult.rows[0]?.avg_hours || 0,
          lastContactDate: lastContactResult.rows[0]?.last_contact || null,
          emailFrequency: frequencyResult.rows[0]?.frequency || 0,
          sentimentTrend: sentimentResult.rows,
        },
        tasks: {
          upcomingDeadlines: deadlinesResult.rows,
          tasksByStatus: {
            pending: dbStats.pending_tasks || 0,
            completed: dbStats.completed_tasks || 0,
            overdue: dbStats.overdue_tasks || 0,
          },
          completionRate: Math.round(completionRate),
        },
      };
    } catch (error) {
      logger.error('Error in getClientStats:', error);
      throw error;
    }
  }

  /**
   * Calculate and update client health score
   * Score is 0-100 based on response time, overdue tasks, and communication frequency
   */
  async updateClientHealthScore(clientId: string): Promise<number> {
    try {
      const client = await query(`SELECT * FROM clients WHERE id = $1`, [clientId]);
      if (client.rows.length === 0) {
        throw new Error('Client not found');
      }

      let score = 100;

      // Factor 1: Average response time (30 points)
      const responseTimeResult = await query(
        `SELECT AVG(EXTRACT(EPOCH FROM (response.received_at - client_email.received_at)) / 3600) as avg_hours
         FROM emails client_email
         LEFT JOIN emails response ON response.thread_id = client_email.thread_id
           AND response.received_at > client_email.received_at
           AND response.email_type = 'outbound'
         WHERE client_email.client_id = $1
         AND client_email.email_type = 'inbound'
         AND response.id IS NOT NULL
         AND client_email.received_at >= NOW() - INTERVAL '30 days'`,
        [clientId]
      );

      const avgResponseHours = responseTimeResult.rows[0]?.avg_hours || 0;
      if (avgResponseHours > 48) {
        score -= 30; // >2 days = bad
      } else if (avgResponseHours > 24) {
        score -= 15; // >1 day = ok
      }

      // Factor 2: Overdue tasks (40 points)
      const overdueResult = await query(
        `SELECT COUNT(*) as count FROM tasks WHERE client_id = $1 AND is_overdue = true`,
        [clientId]
      );
      const overdueCount = parseInt(overdueResult.rows[0]?.count || 0);
      score -= Math.min(overdueCount * 10, 40);

      // Factor 3: Last contact (30 points)
      const daysSinceContact = await query(
        `SELECT EXTRACT(DAY FROM (NOW() - last_contact_date)) as days FROM clients WHERE id = $1`,
        [clientId]
      );
      const days = daysSinceContact.rows[0]?.days || 0;
      if (days > 14) {
        score -= 30;
      } else if (days > 7) {
        score -= 15;
      }

      const finalScore = Math.max(score, 0);

      // Determine status based on health score
      let status = 'active';
      if (finalScore < 50) {
        status = 'at_risk';
      } else if (finalScore < 30) {
        status = 'churned';
      }

      // Update client
      await query(
        `UPDATE clients
         SET health_score = $1, health_updated_at = NOW(), status = $2, updated_at = NOW()
         WHERE id = $3`,
        [finalScore, status, clientId]
      );

      logger.info(`Updated health score for client ${clientId}: ${finalScore}`);

      return finalScore;
    } catch (error) {
      logger.error('Error in updateClientHealthScore:', error);
      throw error;
    }
  }

  /**
   * Get at-risk clients (health score < 50)
   */
  async getAtRiskClients(userId: string): Promise<any[]> {
    try {
      const result = await query(
        `SELECT
          c.*,
          COUNT(DISTINCT t.id) as task_count,
          COUNT(DISTINCT CASE WHEN t.is_overdue = true THEN t.id END) as overdue_task_count
         FROM clients c
         LEFT JOIN tasks t ON t.client_id = c.id
         WHERE c.user_id = $1 AND c.health_score < 50
         GROUP BY c.id
         ORDER BY c.health_score ASC`,
        [userId]
      );

      return result.rows;
    } catch (error) {
      logger.error('Error in getAtRiskClients:', error);
      throw error;
    }
  }

  /**
   * Get all tasks for a client
   */
  async getClientTasks(clientId: string, userId: string, filters: any = {}): Promise<any[]> {
    try {
      let sql = `
        SELECT t.* FROM tasks t
        JOIN clients c ON t.client_id = c.id
        WHERE t.client_id = $1 AND c.user_id = $2
      `;

      const params: any[] = [clientId, userId];
      let paramIndex = 3;

      if (filters.status) {
        sql += ` AND t.status = $${paramIndex}`;
        params.push(filters.status);
        paramIndex++;
      }

      if (filters.isOverdue !== undefined) {
        sql += ` AND t.is_overdue = $${paramIndex}`;
        params.push(filters.isOverdue);
        paramIndex++;
      }

      sql += ` ORDER BY t.created_at DESC`;

      if (filters.limit) {
        sql += ` LIMIT $${paramIndex}`;
        params.push(filters.limit);
      }

      const result = await query(sql, params);

      return result.rows;
    } catch (error) {
      logger.error('Error in getClientTasks:', error);
      throw error;
    }
  }

  /**
   * Get all emails for a client
   */
  async getClientEmails(clientId: string, userId: string, limit: number = 50): Promise<any[]> {
    try {
      const result = await query(
        `SELECT e.* FROM emails e
         JOIN clients c ON e.client_id = c.id
         WHERE e.client_id = $1 AND c.user_id = $2
         ORDER BY e.received_at DESC
         LIMIT $3`,
        [clientId, userId, limit]
      );

      return result.rows;
    } catch (error) {
      logger.error('Error in getClientEmails:', error);
      throw error;
    }
  }

  /**
   * Get activity timeline for a client
   */
  async getClientTimeline(clientId: string, userId: string, limit: number = 100): Promise<any[]> {
    try {
      // Get combined timeline of emails, tasks, and activities
      const result = await query(
        `SELECT
          'email' as type,
          e.id,
          e.subject as title,
          e.received_at as timestamp,
          e.sentiment
         FROM emails e
         JOIN clients c ON e.client_id = c.id
         WHERE e.client_id = $1 AND c.user_id = $2
         UNION ALL
         SELECT
          'task' as type,
          t.id,
          t.title,
          t.created_at as timestamp,
          NULL as sentiment
         FROM tasks t
         JOIN clients c ON t.client_id = c.id
         WHERE t.client_id = $1 AND c.user_id = $2
         UNION ALL
         SELECT
          'activity' as type,
          al.id,
          al.action as title,
          al.created_at as timestamp,
          NULL as sentiment
         FROM activity_logs al
         WHERE al.resource_type = 'client' AND al.resource_id = $1 AND al.user_id = $2
         ORDER BY timestamp DESC
         LIMIT $3`,
        [clientId, userId, limit]
      );

      return result.rows;
    } catch (error) {
      logger.error('Error in getClientTimeline:', error);
      throw error;
    }
  }

  /**
   * Helper: Extract name from email address
   */
  private extractNameFromEmail(email: string): string {
    return email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Helper: Convert camelCase to snake_case
   */
  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  /**
   * Helper: Map database row to Client object
   */
  private mapRowToClient(row: any): Client {
    return {
      id: row.id,
      userId: row.user_id,
      email: row.email,
      name: row.name,
      company: row.company,
      phone: row.phone,
      emailCount: row.email_count,
      firstContactDate: row.first_contact_date,
      lastContactDate: row.last_contact_date,
      status: row.status,
      healthScore: row.health_score,
      healthUpdatedAt: row.health_updated_at,
      notes: row.notes,
      metadata: row.metadata,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export default ClientService;
