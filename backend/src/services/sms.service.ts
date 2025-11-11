import twilio from 'twilio';
import config from '../config/env';
import logger from '../config/logger';

export interface SMSOptions {
  to: string; // Phone number in E.164 format: +1234567890
  body: string;
}

class SMSService {
  private client: any = null;
  private isConfigured = false;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize Twilio client
   */
  private initialize(): void {
    if (!config.twilio.enabled) {
      logger.info('SMS notifications are disabled');
      return;
    }

    if (!config.twilio.accountSid || !config.twilio.authToken) {
      logger.warn('Twilio credentials not configured');
      return;
    }

    try {
      this.client = twilio(config.twilio.accountSid, config.twilio.authToken);
      this.isConfigured = true;
      logger.info('SMS service initialized with Twilio');
    } catch (error) {
      logger.error('Failed to initialize SMS service:', error);
      this.isConfigured = false;
    }
  }

  /**
   * Send an SMS message
   */
  async sendSMS(options: SMSOptions): Promise<boolean> {
    if (!this.isConfigured || !this.client) {
      logger.warn('SMS service not configured, skipping SMS');
      return false;
    }

    try {
      // Validate phone number format (E.164)
      if (!options.to.match(/^\+[1-9]\d{1,14}$/)) {
        logger.error('Invalid phone number format. Use E.164 format: +1234567890');
        return false;
      }

      const message = await this.client.messages.create({
        body: options.body,
        from: config.twilio.phoneNumber,
        to: options.to,
      });

      logger.info('SMS sent successfully', {
        messageSid: message.sid,
        to: options.to,
        status: message.status,
      });

      return true;
    } catch (error: any) {
      logger.error('Failed to send SMS:', {
        error: error.message,
        code: error.code,
        to: options.to,
      });
      return false;
    }
  }

  /**
   * Send task created notification via SMS
   */
  async sendTaskCreatedSMS(
    phoneNumber: string,
    taskTitle: string,
    clientName: string,
    dueDate?: string
  ): Promise<boolean> {
    const message = `[Fluere] New task from ${clientName}: ${taskTitle}${
      dueDate ? ` (Due: ${new Date(dueDate).toLocaleDateString()})` : ''
    }`;

    return this.sendSMS({
      to: phoneNumber,
      body: message,
    });
  }

  /**
   * Send daily digest via SMS
   */
  async sendDailyDigestSMS(
    phoneNumber: string,
    data: {
      tasksDueToday: number;
      followUpsNeeded: number;
      atRiskClients: number;
    }
  ): Promise<boolean> {
    const message = `[Fluere] Daily Briefing: ${data.tasksDueToday} tasks due today, ${data.followUpsNeeded} follow-ups needed, ${data.atRiskClients} at-risk clients.`;

    return this.sendSMS({
      to: phoneNumber,
      body: message,
    });
  }

  /**
   * Send urgent follow-up reminder via SMS
   */
  async sendFollowUpReminderSMS(
    phoneNumber: string,
    clientName: string,
    daysOverdue: number
  ): Promise<boolean> {
    const message = `[Fluere] URGENT: ${clientName} needs follow-up (${daysOverdue} days overdue)`;

    return this.sendSMS({
      to: phoneNumber,
      body: message,
    });
  }

  /**
   * Send client at-risk alert via SMS
   */
  async sendClientAtRiskSMS(
    phoneNumber: string,
    clientName: string,
    healthScore: number
  ): Promise<boolean> {
    const message = `[Fluere] ALERT: ${clientName} is at risk (Health: ${healthScore}/100)`;

    return this.sendSMS({
      to: phoneNumber,
      body: message,
    });
  }
}

// Export singleton instance
export const smsService = new SMSService();
export default smsService;
