import nodemailer, { Transporter } from 'nodemailer';
import Mail from 'nodemailer/lib/mailer';
import config from '../config/env';
import logger from '../config/logger';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  attachments?: Mail.Attachment[];
}

export interface EmailTemplate {
  welcome: (name: string, activationUrl?: string) => EmailOptions;
  taskProcessingComplete: (
    userName: string,
    taskCount: number,
    failedCount: number
  ) => EmailOptions;
  taskProcessingFailed: (userName: string, errorMessage: string) => EmailOptions;
  weeklyDigest: (
    userName: string,
    stats: {
      tasksCreated: number;
      emailsProcessed: number;
      automationsTriggered: number;
    }
  ) => EmailOptions;
  boardConnected: (userName: string, boardName: string) => EmailOptions;
  automationTriggered: (userName: string, automationName: string, result: string) => EmailOptions;
  taskCreated: (
    userName: string,
    taskTitle: string,
    clientName: string,
    dueDate?: string
  ) => EmailOptions;
  dailyDigest: (
    userName: string,
    data: {
      tasksDueToday: number;
      tasksDueThisWeek: number;
      followUpsNeeded: number;
      atRiskClients: number;
      recentTasks: Array<{ title: string; client: string; due_date?: string }>;
      urgentFollowUps: Array<{ client: string; days: number }>;
    }
  ) => EmailOptions;
}

class NotificationService {
  private transporter: Transporter | null = null;
  private isConfigured = false;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize email transporter
   */
  private initialize(): void {
    if (!config.email.enabled) {
      logger.info('Email notifications are disabled');
      return;
    }

    try {
      // Create transporter
      this.transporter = nodemailer.createTransport({
        host: config.email.host,
        port: config.email.port,
        secure: config.email.port === 465, // true for 465, false for other ports
        auth: {
          user: config.email.user,
          pass: config.email.password,
        },
        tls: {
          rejectUnauthorized: config.nodeEnv === 'production',
        },
      });

      this.isConfigured = true;
      logger.info('Email notification service initialized');
    } catch (error) {
      logger.error('Failed to initialize email service:', error);
      this.isConfigured = false;
    }
  }

  /**
   * Verify email configuration
   */
  async verifyConnection(): Promise<boolean> {
    if (!this.isConfigured || !this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      logger.info('Email service connection verified');
      return true;
    } catch (error) {
      logger.error('Email service verification failed:', error);
      return false;
    }
  }

  /**
   * Send an email
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.isConfigured || !this.transporter) {
      logger.warn('Email service not configured, skipping email');
      return false;
    }

    try {
      const mailOptions: Mail.Options = {
        from: config.email.from,
        to: Array.isArray(options.to) ? options.to.join(',') : options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        attachments: options.attachments,
      };

      const info = await this.transporter.sendMail(mailOptions);
      logger.info('Email sent successfully', {
        messageId: info.messageId,
        to: options.to,
        subject: options.subject,
      });

      return true;
    } catch (error) {
      logger.error('Failed to send email:', error);
      return false;
    }
  }

  /**
   * Email templates
   */
  templates: EmailTemplate = {
    welcome: (name: string, activationUrl?: string) => ({
      to: '',
      subject: 'Welcome to TaskSnap!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Welcome to TaskSnap, ${name}! 🎉</h1>
          <p style="color: #666; font-size: 16px;">
            Thank you for signing up! We're excited to help you manage your tasks more efficiently.
          </p>
          <p style="color: #666; font-size: 16px;">
            With TaskSnap, you can:
          </p>
          <ul style="color: #666; font-size: 16px;">
            <li>Automatically extract tasks from emails</li>
            <li>Sync tasks with Trello boards</li>
            <li>Prioritize tasks with AI</li>
            <li>Set up custom automation rules</li>
          </ul>
          ${
            activationUrl
              ? `
            <div style="margin: 30px 0;">
              <a href="${activationUrl}"
                 style="background-color: #0079bf; color: white; padding: 12px 30px;
                        text-decoration: none; border-radius: 5px; display: inline-block;">
                Get Started
              </a>
            </div>
          `
              : ''
          }
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            If you have any questions, feel free to reach out to our support team.
          </p>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          <p style="color: #999; font-size: 12px;">
            This is an automated email from TaskSnap. Please do not reply to this email.
          </p>
        </div>
      `,
      text: `Welcome to TaskSnap, ${name}!

Thank you for signing up! We're excited to help you manage your tasks more efficiently.

With TaskSnap, you can:
- Automatically extract tasks from emails
- Sync tasks with Trello boards
- Prioritize tasks with AI
- Set up custom automation rules

${activationUrl ? `Get started: ${activationUrl}` : ''}

If you have any questions, feel free to reach out to our support team.`,
    }),

    taskProcessingComplete: (userName: string, taskCount: number, failedCount: number) => ({
      to: '',
      subject: `Task Processing Complete - ${taskCount} tasks created`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Task Processing Complete</h1>
          <p style="color: #666; font-size: 16px;">
            Hi ${userName},
          </p>
          <p style="color: #666; font-size: 16px;">
            Your email processing has completed successfully!
          </p>
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0; color: #333;">Summary:</h3>
            <p style="margin: 5px 0; color: #666;">
              ✅ Tasks created: <strong>${taskCount}</strong>
            </p>
            ${
              failedCount > 0
                ? `<p style="margin: 5px 0; color: #e74c3c;">
                     ❌ Failed: <strong>${failedCount}</strong>
                   </p>`
                : ''
            }
          </div>
          <p style="color: #666; font-size: 16px;">
            You can view your tasks in your Trello board now.
          </p>
        </div>
      `,
      text: `Task Processing Complete

Hi ${userName},

Your email processing has completed successfully!

Summary:
✅ Tasks created: ${taskCount}
${failedCount > 0 ? `❌ Failed: ${failedCount}` : ''}

You can view your tasks in your Trello board now.`,
    }),

    taskProcessingFailed: (userName: string, errorMessage: string) => ({
      to: '',
      subject: 'Task Processing Failed',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #e74c3c;">Task Processing Failed</h1>
          <p style="color: #666; font-size: 16px;">
            Hi ${userName},
          </p>
          <p style="color: #666; font-size: 16px;">
            Unfortunately, there was an error processing your emails.
          </p>
          <div style="background-color: #fff5f5; border-left: 4px solid #e74c3c; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #e74c3c;">
              <strong>Error:</strong> ${errorMessage}
            </p>
          </div>
          <p style="color: #666; font-size: 16px;">
            Please try again or contact support if the issue persists.
          </p>
        </div>
      `,
      text: `Task Processing Failed

Hi ${userName},

Unfortunately, there was an error processing your emails.

Error: ${errorMessage}

Please try again or contact support if the issue persists.`,
    }),

    weeklyDigest: (
      userName: string,
      stats: {
        tasksCreated: number;
        emailsProcessed: number;
        automationsTriggered: number;
      }
    ) => ({
      to: '',
      subject: 'Your Weekly TaskSnap Summary',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Your Weekly Summary 📊</h1>
          <p style="color: #666; font-size: 16px;">
            Hi ${userName},
          </p>
          <p style="color: #666; font-size: 16px;">
            Here's what you accomplished this week with TaskSnap:
          </p>
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <div style="margin: 15px 0;">
              <span style="font-size: 24px; color: #0079bf;">📋</span>
              <strong style="font-size: 18px; color: #333;">${stats.tasksCreated}</strong>
              <span style="color: #666;"> tasks created</span>
            </div>
            <div style="margin: 15px 0;">
              <span style="font-size: 24px; color: #0079bf;">📧</span>
              <strong style="font-size: 18px; color: #333;">${stats.emailsProcessed}</strong>
              <span style="color: #666;"> emails processed</span>
            </div>
            <div style="margin: 15px 0;">
              <span style="font-size: 24px; color: #0079bf;">⚡</span>
              <strong style="font-size: 18px; color: #333;">${stats.automationsTriggered}</strong>
              <span style="color: #666;"> automations triggered</span>
            </div>
          </div>
          <p style="color: #666; font-size: 16px;">
            Keep up the great work! 🚀
          </p>
        </div>
      `,
      text: `Your Weekly Summary

Hi ${userName},

Here's what you accomplished this week with TaskSnap:

📋 ${stats.tasksCreated} tasks created
📧 ${stats.emailsProcessed} emails processed
⚡ ${stats.automationsTriggered} automations triggered

Keep up the great work! 🚀`,
    }),

    boardConnected: (userName: string, boardName: string) => ({
      to: '',
      subject: `Board Connected: ${boardName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Board Connected Successfully! ✅</h1>
          <p style="color: #666; font-size: 16px;">
            Hi ${userName},
          </p>
          <p style="color: #666; font-size: 16px;">
            Your Trello board "<strong>${boardName}</strong>" has been successfully connected to TaskSnap.
          </p>
          <p style="color: #666; font-size: 16px;">
            You can now start processing emails and creating tasks automatically!
          </p>
        </div>
      `,
      text: `Board Connected Successfully!

Hi ${userName},

Your Trello board "${boardName}" has been successfully connected to TaskSnap.

You can now start processing emails and creating tasks automatically!`,
    }),

    automationTriggered: (userName: string, automationName: string, result: string) => ({
      to: '',
      subject: `Automation Triggered: ${automationName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Automation Triggered ⚡</h1>
          <p style="color: #666; font-size: 16px;">
            Hi ${userName},
          </p>
          <p style="color: #666; font-size: 16px;">
            Your automation "<strong>${automationName}</strong>" has been triggered.
          </p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0; color: #666;">
              ${result}
            </p>
          </div>
        </div>
      `,
      text: `Automation Triggered

Hi ${userName},

Your automation "${automationName}" has been triggered.

${result}`,
    }),

    taskCreated: (userName: string, taskTitle: string, clientName: string, dueDate?: string) => ({
      to: '',
      subject: `New Task from ${clientName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">New Task Created 📋</h1>
          <p style="color: #666; font-size: 16px;">
            Hi ${userName},
          </p>
          <p style="color: #666; font-size: 16px;">
            A new task has been automatically created from your client email:
          </p>
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0; color: #333;">${taskTitle}</h3>
            <p style="margin: 5px 0; color: #666;">
              <strong>Client:</strong> ${clientName}
            </p>
            ${
              dueDate
                ? `<p style="margin: 5px 0; color: #e67e22;">
                     <strong>Due:</strong> ${new Date(dueDate).toLocaleDateString()}
                   </p>`
                : ''
            }
          </div>
          <p style="color: #666; font-size: 16px;">
            This task has been added to your Trello board.
          </p>
        </div>
      `,
      text: `New Task Created

Hi ${userName},

A new task has been automatically created from your client email:

Task: ${taskTitle}
Client: ${clientName}
${dueDate ? `Due: ${new Date(dueDate).toLocaleDateString()}` : ''}

This task has been added to your Trello board.`,
    }),

    dailyDigest: (
      userName: string,
      data: {
        tasksDueToday: number;
        tasksDueThisWeek: number;
        followUpsNeeded: number;
        atRiskClients: number;
        recentTasks: Array<{ title: string; client: string; due_date?: string }>;
        urgentFollowUps: Array<{ client: string; days: number }>;
      }
    ) => ({
      to: '',
      subject: `Your Daily Briefing - ${new Date().toLocaleDateString()}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Good Morning, ${userName}! ☀️</h1>
          <p style="color: #666; font-size: 16px;">
            Here's your daily briefing for ${new Date().toLocaleDateString()}:
          </p>

          <!-- Overview Stats -->
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #333;">Today's Overview</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <div>
                <span style="font-size: 24px; color: #e74c3c;">${data.tasksDueToday}</span>
                <p style="margin: 0; color: #666; font-size: 14px;">Tasks Due Today</p>
              </div>
              <div>
                <span style="font-size: 24px; color: #f39c12;">${data.tasksDueThisWeek}</span>
                <p style="margin: 0; color: #666; font-size: 14px;">Due This Week</p>
              </div>
              <div>
                <span style="font-size: 24px; color: #3498db;">${data.followUpsNeeded}</span>
                <p style="margin: 0; color: #666; font-size: 14px;">Follow-ups Needed</p>
              </div>
              <div>
                <span style="font-size: 24px; color: ${data.atRiskClients > 0 ? '#e74c3c' : '#27ae60'}">${
        data.atRiskClients
      }</span>
                <p style="margin: 0; color: #666; font-size: 14px;">At-Risk Clients</p>
              </div>
            </div>
          </div>

          <!-- Recent Tasks -->
          ${
            data.recentTasks.length > 0
              ? `
          <div style="margin: 20px 0;">
            <h3 style="color: #333;">Recent Tasks</h3>
            ${data.recentTasks
              .slice(0, 5)
              .map(
                (task) => `
              <div style="border-left: 3px solid #0079bf; padding: 10px; margin: 10px 0; background-color: #f9f9f9;">
                <strong style="color: #333;">${task.title}</strong>
                <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">
                  Client: ${task.client}
                  ${task.due_date ? ` • Due: ${new Date(task.due_date).toLocaleDateString()}` : ''}
                </p>
              </div>
            `
              )
              .join('')}
          </div>
          `
              : ''
          }

          <!-- Urgent Follow-ups -->
          ${
            data.urgentFollowUps.length > 0
              ? `
          <div style="margin: 20px 0;">
            <h3 style="color: #e74c3c;">⚠️ Urgent Follow-ups</h3>
            ${data.urgentFollowUps
              .slice(0, 5)
              .map(
                (followUp) => `
              <div style="border-left: 3px solid #e74c3c; padding: 10px; margin: 10px 0; background-color: #fff5f5;">
                <strong style="color: #e74c3c;">${followUp.client}</strong>
                <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">
                  No response for ${followUp.days} days
                </p>
              </div>
            `
              )
              .join('')}
          </div>
          `
              : ''
          }

          <p style="color: #666; font-size: 16px; margin-top: 30px;">
            Have a productive day! 🚀
          </p>

          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          <p style="color: #999; font-size: 12px;">
            This is your automated daily briefing from TaskSnap.
          </p>
        </div>
      `,
      text: `Good Morning, ${userName}!

Here's your daily briefing for ${new Date().toLocaleDateString()}:

TODAY'S OVERVIEW:
- Tasks Due Today: ${data.tasksDueToday}
- Due This Week: ${data.tasksDueThisWeek}
- Follow-ups Needed: ${data.followUpsNeeded}
- At-Risk Clients: ${data.atRiskClients}

${
  data.recentTasks.length > 0
    ? `
RECENT TASKS:
${data.recentTasks
  .slice(0, 5)
  .map(
    (task) =>
      `- ${task.title} (${task.client})${task.due_date ? ` - Due: ${new Date(task.due_date).toLocaleDateString()}` : ''}`
  )
  .join('\n')}
`
    : ''
}

${
  data.urgentFollowUps.length > 0
    ? `
URGENT FOLLOW-UPS:
${data.urgentFollowUps
  .slice(0, 5)
  .map((followUp) => `- ${followUp.client} (No response for ${followUp.days} days)`)
  .join('\n')}
`
    : ''
}

Have a productive day! 🚀`,
    }),
  };

  /**
   * Send welcome email to new user
   */
  async sendWelcomeEmail(email: string, name: string, activationUrl?: string): Promise<boolean> {
    const template = this.templates.welcome(name, activationUrl);
    return this.sendEmail({ ...template, to: email });
  }

  /**
   * Send task processing complete notification
   */
  async sendTaskProcessingComplete(
    email: string,
    userName: string,
    taskCount: number,
    failedCount: number = 0
  ): Promise<boolean> {
    const template = this.templates.taskProcessingComplete(userName, taskCount, failedCount);
    return this.sendEmail({ ...template, to: email });
  }

  /**
   * Send task processing failed notification
   */
  async sendTaskProcessingFailed(
    email: string,
    userName: string,
    errorMessage: string
  ): Promise<boolean> {
    const template = this.templates.taskProcessingFailed(userName, errorMessage);
    return this.sendEmail({ ...template, to: email });
  }

  /**
   * Send weekly digest
   */
  async sendWeeklyDigest(
    email: string,
    userName: string,
    stats: {
      tasksCreated: number;
      emailsProcessed: number;
      automationsTriggered: number;
    }
  ): Promise<boolean> {
    const template = this.templates.weeklyDigest(userName, stats);
    return this.sendEmail({ ...template, to: email });
  }

  /**
   * Send board connected notification
   */
  async sendBoardConnected(email: string, userName: string, boardName: string): Promise<boolean> {
    const template = this.templates.boardConnected(userName, boardName);
    return this.sendEmail({ ...template, to: email });
  }

  /**
   * Send automation triggered notification
   */
  async sendAutomationTriggered(
    email: string,
    userName: string,
    automationName: string,
    result: string
  ): Promise<boolean> {
    const template = this.templates.automationTriggered(userName, automationName, result);
    return this.sendEmail({ ...template, to: email });
  }

  /**
   * Send task created notification
   */
  async sendTaskCreated(
    email: string,
    userName: string,
    taskTitle: string,
    clientName: string,
    dueDate?: string
  ): Promise<boolean> {
    const template = this.templates.taskCreated(userName, taskTitle, clientName, dueDate);
    return this.sendEmail({ ...template, to: email });
  }

  /**
   * Send daily digest notification
   */
  async sendDailyDigest(
    email: string,
    userName: string,
    data: {
      tasksDueToday: number;
      tasksDueThisWeek: number;
      followUpsNeeded: number;
      atRiskClients: number;
      recentTasks: Array<{ title: string; client: string; due_date?: string }>;
      urgentFollowUps: Array<{ client: string; days: number }>;
    }
  ): Promise<boolean> {
    const template = this.templates.dailyDigest(userName, data);
    return this.sendEmail({ ...template, to: email });
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
export default notificationService;
