import OpenAI from 'openai';
import { query } from '../config/database';
import logger from '../config/logger';
import config from '../config/env';
import notificationService from './notification.service';

/**
 * Daily Summary Service
 * Generates AI-powered daily briefings for users
 */

export interface DailySummaryData {
  tasksDueToday: number;
  tasksDueTomorrow: number;
  tasksDueThisWeek: number;
  overdueTasks: number;
  pendingFollowUps: number;
  urgentFollowUps: number;
  activeClients: number;
  atRiskClients: number;
  recentTasks: Array<{
    title: string;
    client: string;
    dueDate?: string;
    priority?: string;
  }>;
  urgentFollowUpsList: Array<{
    clientName: string;
    clientEmail: string;
    daysSinceMessage: number;
    urgencyScore: number;
    subject?: string;
  }>;
  atRiskClientsList: Array<{
    name: string;
    email: string;
    healthScore: number;
    reason: string;
  }>;
}

export interface DailySummary {
  id: string;
  userId: string;
  summaryDate: Date;
  summaryText: string;
  summaryData: DailySummaryData;
  tasksDueToday: number;
  tasksDueTomorrow: number;
  pendingFollowUps: number;
  activeClients: number;
  emailSent: boolean;
  sentAt?: Date;
  createdAt: Date;
}

class SummaryService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey,
    });
  }

  /**
   * Generate daily summary for a user
   */
  async generateDailySummary(userId: string): Promise<DailySummary | null> {
    try {
      logger.info(`Generating daily summary for user ${userId}`);

      // Get user info and preferences
      const userResult = await query(
        `SELECT u.id, u.name, u.email, up.daily_summary_enabled
         FROM users u
         LEFT JOIN user_preferences up ON u.id = up.user_id
         WHERE u.id = $1`,
        [userId]
      );

      if (userResult.rows.length === 0) {
        logger.error(`User ${userId} not found`);
        return null;
      }

      const user = userResult.rows[0];

      // Check if daily summary is enabled
      if (user.daily_summary_enabled === false) {
        logger.info(`Daily summary disabled for user ${userId}`);
        return null;
      }

      // Check if summary already exists for today
      const today = new Date().toISOString().split('T')[0];
      const existingResult = await query(
        `SELECT * FROM daily_summaries
         WHERE user_id = $1 AND summary_date = $2`,
        [userId, today]
      );

      if (existingResult.rows.length > 0) {
        logger.info(`Daily summary already exists for user ${userId} on ${today}`);
        return this.mapSummary(existingResult.rows[0]);
      }

      // Gather data for summary
      const summaryData = await this.gatherSummaryData(userId);

      // Generate AI summary text
      const summaryText = await this.generateAISummary(user.name, summaryData);

      // Save summary to database
      const result = await query(
        `INSERT INTO daily_summaries (
          user_id, summary_date, summary_text, summary_data,
          tasks_due_today, tasks_due_tomorrow, pending_follow_ups, active_clients,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        RETURNING *`,
        [
          userId,
          today,
          summaryText,
          JSON.stringify(summaryData),
          summaryData.tasksDueToday,
          summaryData.tasksDueTomorrow,
          summaryData.pendingFollowUps,
          summaryData.activeClients,
        ]
      );

      const summary = this.mapSummary(result.rows[0]);

      // Send email notification
      await this.sendSummaryEmail(user, summary, summaryData);

      logger.info(`Daily summary generated and sent for user ${userId}`);

      return summary;
    } catch (error) {
      logger.error('Error generating daily summary:', error);
      throw error;
    }
  }

  /**
   * Gather all data needed for the summary
   */
  private async gatherSummaryData(userId: string): Promise<DailySummaryData> {
    try {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() + 7);

      // Get tasks due today
      const tasksDueTodayResult = await query(
        `SELECT COUNT(*) as count
         FROM tasks
         WHERE user_id = $1
         AND DATE(due_date) = DATE($2)
         AND status NOT IN ('completed', 'cancelled')`,
        [userId, now.toISOString()]
      );

      // Get tasks due tomorrow
      const tasksDueTomorrowResult = await query(
        `SELECT COUNT(*) as count
         FROM tasks
         WHERE user_id = $1
         AND DATE(due_date) = DATE($2)
         AND status NOT IN ('completed', 'cancelled')`,
        [userId, tomorrow.toISOString()]
      );

      // Get tasks due this week
      const tasksDueThisWeekResult = await query(
        `SELECT COUNT(*) as count
         FROM tasks
         WHERE user_id = $1
         AND due_date >= $2
         AND due_date <= $3
         AND status NOT IN ('completed', 'cancelled')`,
        [userId, now.toISOString(), weekEnd.toISOString()]
      );

      // Get overdue tasks
      const overdueTasksResult = await query(
        `SELECT COUNT(*) as count
         FROM tasks
         WHERE user_id = $1
         AND due_date < $2
         AND status NOT IN ('completed', 'cancelled')`,
        [userId, now.toISOString()]
      );

      // Get pending follow-ups
      const pendingFollowUpsResult = await query(
        `SELECT COUNT(*) as count
         FROM follow_ups
         WHERE user_id = $1 AND status = 'pending'`,
        [userId]
      );

      // Get urgent follow-ups
      const urgentFollowUpsResult = await query(
        `SELECT COUNT(*) as count
         FROM follow_ups
         WHERE user_id = $1 AND status = 'pending' AND urgency_score >= 7`,
        [userId]
      );

      // Get active clients
      const activeClientsResult = await query(
        `SELECT COUNT(*) as count
         FROM clients
         WHERE user_id = $1 AND status = 'active'`,
        [userId]
      );

      // Get at-risk clients
      const atRiskClientsResult = await query(
        `SELECT COUNT(*) as count
         FROM clients
         WHERE user_id = $1 AND (status = 'at_risk' OR health_score < 50)`,
        [userId]
      );

      // Get recent tasks (last 3 days)
      const recentTasksResult = await query(
        `SELECT
          t.title,
          c.name as client,
          t.due_date,
          t.priority
         FROM tasks t
         LEFT JOIN clients c ON t.client_id = c.id
         WHERE t.user_id = $1
         AND t.created_at >= NOW() - INTERVAL '3 days'
         ORDER BY t.created_at DESC
         LIMIT 5`,
        [userId]
      );

      // Get urgent follow-ups list
      const urgentFollowUpsListResult = await query(
        `SELECT
          c.name as client_name,
          c.email as client_email,
          f.days_since_client_message,
          f.urgency_score,
          e.subject
         FROM follow_ups f
         LEFT JOIN clients c ON f.client_id = c.id
         LEFT JOIN emails e ON f.email_id = e.id
         WHERE f.user_id = $1
         AND f.status = 'pending'
         AND f.urgency_score >= 7
         ORDER BY f.urgency_score DESC, f.created_at ASC
         LIMIT 5`,
        [userId]
      );

      // Get at-risk clients list
      const atRiskClientsListResult = await query(
        `SELECT
          name,
          email,
          health_score,
          CASE
            WHEN health_score < 30 THEN 'Critical communication issues'
            WHEN health_score < 50 THEN 'Declining engagement'
            ELSE 'At risk'
          END as reason
         FROM clients
         WHERE user_id = $1
         AND (status = 'at_risk' OR health_score < 50)
         ORDER BY health_score ASC
         LIMIT 5`,
        [userId]
      );

      return {
        tasksDueToday: parseInt(tasksDueTodayResult.rows[0]?.count || '0'),
        tasksDueTomorrow: parseInt(tasksDueTomorrowResult.rows[0]?.count || '0'),
        tasksDueThisWeek: parseInt(tasksDueThisWeekResult.rows[0]?.count || '0'),
        overdueTasks: parseInt(overdueTasksResult.rows[0]?.count || '0'),
        pendingFollowUps: parseInt(pendingFollowUpsResult.rows[0]?.count || '0'),
        urgentFollowUps: parseInt(urgentFollowUpsResult.rows[0]?.count || '0'),
        activeClients: parseInt(activeClientsResult.rows[0]?.count || '0'),
        atRiskClients: parseInt(atRiskClientsResult.rows[0]?.count || '0'),
        recentTasks: recentTasksResult.rows.map((row: any) => ({
          title: row.title,
          client: row.client,
          dueDate: row.due_date,
          priority: row.priority,
        })),
        urgentFollowUpsList: urgentFollowUpsListResult.rows.map((row: any) => ({
          clientName: row.client_name,
          clientEmail: row.client_email,
          daysSinceMessage: row.days_since_client_message,
          urgencyScore: row.urgency_score,
          subject: row.subject,
        })),
        atRiskClientsList: atRiskClientsListResult.rows.map((row: any) => ({
          name: row.name,
          email: row.email,
          healthScore: row.health_score,
          reason: row.reason,
        })),
      };
    } catch (error) {
      logger.error('Error gathering summary data:', error);
      throw error;
    }
  }

  /**
   * Generate AI summary using OpenAI
   */
  private async generateAISummary(
    userName: string,
    data: DailySummaryData
  ): Promise<string> {
    try {
      const prompt = `Generate a friendly, concise daily briefing for ${userName}, a freelancer managing client work.

**Today's Data:**
- Tasks due today: ${data.tasksDueToday}
- Tasks due tomorrow: ${data.tasksDueTomorrow}
- Tasks due this week: ${data.tasksDueThisWeek}
- Overdue tasks: ${data.overdueTasks}
- Pending follow-ups: ${data.pendingFollowUps}
- Urgent follow-ups: ${data.urgentFollowUps}
- Active clients: ${data.activeClients}
- At-risk clients: ${data.atRiskClients}

${data.urgentFollowUpsList.length > 0 ? `**Urgent Follow-ups:**
${data.urgentFollowUpsList.map(f => `- ${f.clientName}: ${f.daysSinceMessage} days since last message (urgency: ${f.urgencyScore}/10)`).join('\n')}` : ''}

${data.atRiskClientsList.length > 0 ? `**At-Risk Clients:**
${data.atRiskClientsList.map(c => `- ${c.name}: Health score ${c.healthScore}/100 - ${c.reason}`).join('\n')}` : ''}

${data.recentTasks.length > 0 ? `**Recent Tasks:**
${data.recentTasks.map(t => `- ${t.title}${t.client ? ` (${t.client})` : ''}`).join('\n')}` : ''}

**Instructions:**
1. Start with a warm greeting
2. Highlight the most important items first (urgent follow-ups, at-risk clients, overdue tasks)
3. Provide actionable recommendations
4. Keep it under 150 words
5. Use a friendly, encouraging tone
6. End with a motivating note

Generate the briefing:`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are a helpful assistant that generates daily briefings for freelancers. Be concise, actionable, and encouraging.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      });

      return completion.choices[0]?.message?.content || 'Summary generation failed';
    } catch (error) {
      logger.error('Error generating AI summary:', error);
      // Return a basic summary if AI fails
      return this.generateBasicSummary(userName, data);
    }
  }

  /**
   * Generate basic summary without AI (fallback)
   */
  private generateBasicSummary(userName: string, data: DailySummaryData): string {
    let summary = `Good morning, ${userName}!\n\n`;

    if (data.tasksDueToday > 0) {
      summary += `You have ${data.tasksDueToday} task${data.tasksDueToday > 1 ? 's' : ''} due today. `;
    }

    if (data.urgentFollowUps > 0) {
      summary += `${data.urgentFollowUps} urgent follow-up${data.urgentFollowUps > 1 ? 's' : ''} need your attention. `;
    }

    if (data.atRiskClients > 0) {
      summary += `${data.atRiskClients} client${data.atRiskClients > 1 ? 's are' : ' is'} at risk. `;
    }

    if (data.pendingFollowUps > 0) {
      summary += `\n\nYou have ${data.pendingFollowUps} pending follow-up${data.pendingFollowUps > 1 ? 's' : ''}.`;
    }

    summary += '\n\nHave a productive day!';

    return summary;
  }

  /**
   * Send summary email to user
   */
  private async sendSummaryEmail(
    user: any,
    summary: DailySummary,
    data: DailySummaryData
  ): Promise<void> {
    try {
      // Map data to template format
      const templateData = {
        tasksDueToday: data.tasksDueToday,
        tasksDueThisWeek: data.tasksDueThisWeek,
        followUpsNeeded: data.pendingFollowUps,
        atRiskClients: data.atRiskClients,
        recentTasks: data.recentTasks.map(t => ({
          title: t.title,
          client: t.client,
          due_date: t.dueDate,
        })),
        urgentFollowUps: data.urgentFollowUpsList.map(f => ({
          client: f.clientName,
          days: f.daysSinceMessage,
        })),
      };

      const emailOptions = notificationService.templates.dailyDigest(user.name, templateData);

      await notificationService.sendEmail(emailOptions);

      // Mark as sent
      await query(
        `UPDATE daily_summaries
         SET email_sent = true, sent_at = NOW()
         WHERE id = $1`,
        [summary.id]
      );

      logger.info(`Daily summary email sent to ${user.email}`);
    } catch (error) {
      logger.error('Error sending summary email:', error);
      throw error;
    }
  }

  /**
   * Get summary by date
   */
  async getSummary(userId: string, date: string): Promise<DailySummary | null> {
    try {
      const result = await query(
        `SELECT * FROM daily_summaries
         WHERE user_id = $1 AND summary_date = $2`,
        [userId, date]
      );

      return result.rows.length > 0 ? this.mapSummary(result.rows[0]) : null;
    } catch (error) {
      logger.error('Error getting summary:', error);
      throw error;
    }
  }

  /**
   * Get user's summary history
   */
  async getSummaryHistory(
    userId: string,
    limit: number = 30
  ): Promise<DailySummary[]> {
    try {
      const result = await query(
        `SELECT * FROM daily_summaries
         WHERE user_id = $1
         ORDER BY summary_date DESC
         LIMIT $2`,
        [userId, limit]
      );

      return result.rows.map((row: any) => this.mapSummary(row));
    } catch (error) {
      logger.error('Error getting summary history:', error);
      throw error;
    }
  }

  /**
   * Map database row to DailySummary
   */
  private mapSummary(row: any): DailySummary {
    return {
      id: row.id,
      userId: row.user_id,
      summaryDate: row.summary_date,
      summaryText: row.summary_text,
      summaryData: row.summary_data,
      tasksDueToday: row.tasks_due_today,
      tasksDueTomorrow: row.tasks_due_tomorrow,
      pendingFollowUps: row.pending_follow_ups,
      activeClients: row.active_clients,
      emailSent: row.email_sent,
      sentAt: row.sent_at,
      createdAt: row.created_at,
    };
  }
}

export default SummaryService;
