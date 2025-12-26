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
    status?: string;
  }>;
  activeSpecs?: Array<{
    title: string;
    clientName: string;
    locked: boolean;
  }>;
  pendingApproval?: Array<{
    title: string;
    clientName: string;
    hasSpec: boolean;
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
   * Check if summary should be sent now based on user's timezone and preferred time
   */
  async shouldSendSummaryNow(
    userId: string,
    preferredTime: string,
    timezone: string
  ): Promise<boolean> {
    try {
      // Check if summary already sent today
      const today = new Date().toISOString().split('T')[0];
      const existingResult = await query(
        `SELECT * FROM daily_summaries
         WHERE user_id = $1 AND summary_date = $2`,
        [userId, today]
      );

      if (existingResult.rows.length > 0) {
        return false; // Already sent today
      }

      // Get current time in user's timezone
      const now = new Date();
      const userTimeString = now.toLocaleString('en-US', { timeZone: timezone });
      const userTime = new Date(userTimeString);

      // Extract hour and minute from preferred time (HH:MM:SS format)
      const [hours, minutes] = preferredTime.split(':').map(Number);

      // Check if current hour matches preferred hour (within the same hour window)
      if (userTime.getHours() === hours) {
        logger.info('Time to send summary for user', {
          userId,
          timezone,
          preferredTime,
          currentUserTime: userTime.toLocaleTimeString(),
        });
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Error checking if should send summary:', error);
      return false;
    }
  }

  /**
   * Generate daily summary for a user
   * @param force - If true, bypass duplicate check and send even if already sent today
   */
  async generateDailySummary(userId: string, force: boolean = false): Promise<DailySummary | null> {
    try {
      logger.info(`Generating daily summary for user ${userId}`);

      // Get user info and preferences
      const userResult = await query(
        `SELECT u.id, u.email, up.daily_summary_enabled
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

      // Check if summary already exists for today (unless force=true)
      const today = new Date().toISOString().split('T')[0];

      if (!force) {
        const existingResult = await query(
          `SELECT * FROM daily_summaries
           WHERE user_id = $1 AND summary_date = $2`,
          [userId, today]
        );

        if (existingResult.rows.length > 0) {
          logger.info(`Daily summary already exists for user ${userId} on ${today}`);
          return this.mapSummary(existingResult.rows[0]);
        }
      }

      // Gather data for summary
      const summaryData = await this.gatherSummaryData(userId);

      // Generate AI summary text
      // Extract name from email (part before @) or use 'there'
      const userName = user.email ? user.email.split('@')[0] : 'there';
      const summaryText = await this.generateAISummary(userName, summaryData);

      // Save summary to database (upsert if force=true)
      const result = await query(
        `INSERT INTO daily_summaries (
          user_id, summary_date, summary_text, summary_data,
          tasks_due_today, tasks_due_tomorrow, pending_follow_ups, active_clients,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        ON CONFLICT (user_id, summary_date)
        DO UPDATE SET
          summary_text = EXCLUDED.summary_text,
          summary_data = EXCLUDED.summary_data,
          tasks_due_today = EXCLUDED.tasks_due_today,
          tasks_due_tomorrow = EXCLUDED.tasks_due_tomorrow,
          pending_follow_ups = EXCLUDED.pending_follow_ups,
          active_clients = EXCLUDED.active_clients,
          email_sent = false,
          sent_at = NULL
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

      // Get high-priority active tasks
      const recentTasksResult = await query(
        `SELECT
          t.title,
          c.name as client,
          t.due_date,
          t.priority,
          t.status
         FROM tasks t
         LEFT JOIN clients c ON t.client_id = c.id
         WHERE t.user_id = $1
         AND t.status NOT IN ('completed', 'cancelled')
         AND (
           t.due_date <= NOW() + INTERVAL '3 days'
           OR t.priority = 'high'
           OR t.priority = 'urgent'
         )
         ORDER BY
           CASE t.priority
             WHEN 'urgent' THEN 1
             WHEN 'high' THEN 2
             WHEN 'medium' THEN 3
             ELSE 4
           END,
           t.due_date ASC NULLS LAST
         LIMIT 10`,
        [userId]
      );

      // Get active specs/projects
      const activeSpecsResult = await query(
        `SELECT
          ps.id,
          ps.project_name,
          ps.client_id,
          c.name as client_name,
          ps.status,
          ps.locked_at
         FROM project_specs ps
         LEFT JOIN clients c ON ps.client_id = c.id
         WHERE ps.user_id = $1
         AND ps.status != 'locked'
         ORDER BY ps.updated_at DESC
         LIMIT 5`,
        [userId]
      );

      // Get pending tasks awaiting approval
      const pendingApprovalResult = await query(
        `SELECT
          pt.title,
          pt.description,
          c.name as client_name,
          pt.spec_id
         FROM pending_tasks pt
         LEFT JOIN clients c ON pt.client_id = c.id
         WHERE pt.user_id = $1
         AND pt.status = 'pending'
         ORDER BY pt.created_at DESC
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
          status: row.status,
        })),
        activeSpecs: activeSpecsResult.rows.map((row: any) => ({
          title: row.project_name,
          clientName: row.client_name,
          status: row.status,
        })),
        pendingApproval: pendingApprovalResult.rows.map((row: any) => ({
          title: row.title,
          clientName: row.client_name,
          hasSpec: !!row.spec_id,
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
      const prompt = `Generate a professional work brief organized by priority. Use clean formatting with minimal emojis.

**Work Data:**
- Tasks due today: ${data.tasksDueToday}
- Tasks due tomorrow: ${data.tasksDueTomorrow}
- Tasks due this week: ${data.tasksDueThisWeek}
- Overdue tasks: ${data.overdueTasks}

${data.recentTasks.length > 0 ? `**Task Details:**
${data.recentTasks.slice(0, 10).map(t => `- ${t.title}${t.client ? ` (${t.client})` : ''}${t.priority ? ` - ${t.priority.toUpperCase()}` : ''}${t.dueDate ? ` - Due ${new Date(t.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}`).join('\n')}` : ''}

${data.activeSpecs && data.activeSpecs.length > 0 ? `**Active Projects:**
${data.activeSpecs.map(s => `- ${s.title}${s.clientName ? ` (${s.clientName})` : ''}`).join('\n')}` : ''}

${data.pendingApproval && data.pendingApproval.length > 0 ? `**Awaiting Approval:**
${data.pendingApproval.slice(0, 5).map(p => `- ${p.title}${p.clientName ? ` (${p.clientName})` : ''}`).join('\n')}` : ''}

**Format Requirements:**
Organize as clean bullet-point sections:

**Due Today** (${data.tasksDueToday})
${data.tasksDueToday > 0 ? '[List each task with client name]' : '- No tasks due today'}

**Due This Week** (${data.tasksDueThisWeek})
${data.tasksDueThisWeek > 0 ? '[List tasks with due dates]' : '- No tasks due this week'}

${data.overdueTasks > 0 ? '**Overdue** (' + data.overdueTasks + ')\n[List overdue tasks]' : ''}

${data.pendingApproval && data.pendingApproval.length > 0 ? '**Awaiting Approval**\n[List items pending approval]' : ''}

${data.activeSpecs && data.activeSpecs.length > 0 ? '**Active Projects**\n[List project names with clients]' : ''}

Use professional language. No greetings, no motivational messages. Just organized work items.`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are a professional work assistant. Generate clean, organized bullet-point briefs. Use minimal emojis (max 1-2 per section). Focus on clarity and professionalism. No greetings, no motivational language - just structured work lists.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.5,
        max_tokens: 800,
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
      // Map data to template format, including the AI-generated summary
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
        aiSummary: summary.summaryText, // Include the AI-generated comprehensive briefing
      };

      // Extract name from email (part before @) or use 'there'
      const userName = user.email ? user.email.split('@')[0] : 'there';
      const emailOptions = notificationService.templates.dailyDigest(userName, templateData);

      // Set the recipient email address
      await notificationService.sendEmail({ ...emailOptions, to: user.email });

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
