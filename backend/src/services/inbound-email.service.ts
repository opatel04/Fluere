import { simpleParser, ParsedMail, AddressObject } from 'mailparser';
import { query, transaction } from '../config/database';
import logger from '../config/logger';
import config from '../config/env';
import aiServiceInstance from './ai.service';
import notificationServiceInstance from './notification.service';
import activityLogServiceInstance from './activity-log.service';
import trelloService from './trello.service';

/**
 * Inbound Email Service
 * Handles forwarded emails received via Resend/SendGrid webhook
 * Processes email → detects/creates client → extracts tasks → creates Trello cards
 */

export interface InboundEmailData {
  from: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
  headers?: any;
  raw?: string;
  messageId?: string;
  inReplyTo?: string;
  references?: string[];
}

export interface ParsedInboundEmail {
  fromEmail: string;
  fromName: string;
  toEmail: string;
  subject: string;
  bodyText: string;
  bodyHtml: string;
  messageId: string;
  inReplyTo?: string;
  references: string[];
  isForwarded: boolean;
  originalSender?: {
    email: string;
    name: string;
  };
}

export interface ProcessingResult {
  success: boolean;
  inboundEmailId: string;
  clientId?: string;
  taskId?: string;
  trelloCardId?: string;
  error?: string;
}

class InboundEmailService {
  private aiService = aiServiceInstance;
  private notificationService = notificationServiceInstance;
  private activityLogService = activityLogServiceInstance;

  /**
   * Main entry point: Process inbound email from webhook
   */
  async processInboundEmail(emailData: InboundEmailData, userId: string): Promise<ProcessingResult> {
    const startTime = Date.now();
    let inboundEmailId: string | null = null;

    try {
      logger.info(`Processing inbound email from ${emailData.from} for user ${userId}`);

      // Step 1: Parse email
      const parsed = await this.parseEmail(emailData);

      // Step 2: Store raw inbound email
      inboundEmailId = await this.storeInboundEmail(userId, emailData, parsed);

      // Step 3: Extract original sender (handle forwarded emails)
      const clientEmail = parsed.originalSender?.email || parsed.fromEmail;
      const clientName = parsed.originalSender?.name || parsed.fromName;

      // Step 4: Find or create client
      const clientId = await this.findOrCreateClient(userId, clientEmail, clientName);

      // Step 5: Update inbound email with client association
      await this.updateInboundEmailClient(inboundEmailId, clientId);

      // Step 6: Extract task from email using AI
      const taskExtraction = await this.aiService.processEmailWithValidation(
        parsed.bodyText || parsed.subject,
        { enableValidation: true }
      );

      if (taskExtraction.tasks.length === 0) {
        logger.warn('No tasks extracted from email');
        await this.updateInboundEmailStatus(inboundEmailId, 'completed', null);
        return {
          success: true,
          inboundEmailId,
          clientId,
        };
      }

      // Step 7: Create task(s)
      const task = taskExtraction.tasks[0]; // Use first task for now
      const taskId = await this.createTask(userId, clientId, task, inboundEmailId, parsed);

      // Step 8: Create Trello card if user has Trello connected
      let trelloCardId: string | undefined;
      try {
        const emailContext = {
          from: parsed.fromEmail,
          subject: parsed.subject,
          date: new Date(),
        };
        trelloCardId = await this.createTrelloCard(userId, taskId, task, emailContext);
      } catch (error) {
        logger.warn('Failed to create Trello card (user may not be connected):', error);
      }

      // Step 9: Send confirmation email to user
      await this.sendConfirmationEmail(userId, clientName, task.name || task.description);

      // Step 10: Log activity
      await this.activityLogService.logActivity({
        userId,
        action: 'inbound_email_processed',
        resourceType: 'email',
        resourceId: inboundEmailId,
        resourceName: parsed.subject,
        actionStatus: 'success',
        actionDetails: {
          clientEmail,
          taskCount: taskExtraction.tasks.length,
          confidence: taskExtraction.confidence,
          trelloCardCreated: !!trelloCardId,
        },
        durationMs: Date.now() - startTime,
      });

      // Mark inbound email as completed
      await this.updateInboundEmailStatus(inboundEmailId, 'completed', null, taskId);

      logger.info(`Inbound email processed successfully in ${Date.now() - startTime}ms`);

      return {
        success: true,
        inboundEmailId,
        clientId,
        taskId,
        trelloCardId,
      };
    } catch (error: any) {
      logger.error('Error processing inbound email:', error);

      // Update status to failed if we have an ID
      if (inboundEmailId) {
        await this.updateInboundEmailStatus(inboundEmailId, 'failed', error.message);
      }

      // Log failed activity
      await this.activityLogService.logActivity({
        userId,
        action: 'inbound_email_processing_failed',
        resourceType: 'email',
        resourceId: inboundEmailId || 'unknown',
        actionStatus: 'failed',
        errorMessage: error.message,
        durationMs: Date.now() - startTime,
      });

      return {
        success: false,
        inboundEmailId: inboundEmailId || 'unknown',
        error: error.message,
      };
    }
  }

  /**
   * Parse email from raw data or structured data
   */
  private async parseEmail(emailData: InboundEmailData): Promise<ParsedInboundEmail> {
    try {
      // If raw email is provided, parse it
      if (emailData.raw) {
        const parsed: ParsedMail = await simpleParser(emailData.raw);
        return this.extractEmailDetails(parsed);
      }

      // Otherwise, use structured data
      return {
        fromEmail: this.extractEmail(emailData.from),
        fromName: this.extractName(emailData.from),
        toEmail: this.extractEmail(emailData.to),
        subject: emailData.subject || '',
        bodyText: emailData.text || '',
        bodyHtml: emailData.html || '',
        messageId: emailData.messageId || '',
        inReplyTo: emailData.inReplyTo,
        references: emailData.references || [],
        isForwarded: this.isForwardedEmail(emailData.subject, emailData.text),
        originalSender: this.extractOriginalSender(emailData.text),
      };
    } catch (error) {
      logger.error('Error parsing email:', error);
      throw new Error('Failed to parse email');
    }
  }

  /**
   * Extract email details from parsed mail object
   */
  private extractEmailDetails(parsed: ParsedMail): ParsedInboundEmail {
    const fromValue = parsed.from && 'value' in parsed.from ? parsed.from.value : [];
    const toValue = parsed.to && 'value' in parsed.to ? parsed.to.value : [];
    const from = Array.isArray(fromValue) ? fromValue[0] : fromValue;
    const to = Array.isArray(toValue) ? toValue[0] : toValue;

    return {
      fromEmail: from?.address || '',
      fromName: from?.name || '',
      toEmail: (to as any)?.address || '',
      subject: parsed.subject || '',
      bodyText: parsed.text || '',
      bodyHtml: parsed.html || '',
      messageId: parsed.messageId || '',
      inReplyTo: parsed.inReplyTo,
      references: Array.isArray(parsed.references) ? parsed.references : (parsed.references ? [parsed.references] : []),
      isForwarded: this.isForwardedEmail(parsed.subject, parsed.text),
      originalSender: this.extractOriginalSender(parsed.text),
    };
  }

  /**
   * Check if email is forwarded
   */
  private isForwardedEmail(subject?: string, body?: string): boolean {
    const forwardIndicators = [
      /^Fwd:/i,
      /^FW:/i,
      /---------- Forwarded message ---------/,
      /Begin forwarded message:/,
    ];

    return forwardIndicators.some(
      pattern => pattern.test(subject || '') || pattern.test(body || '')
    );
  }

  /**
   * Extract original sender from forwarded email
   */
  private extractOriginalSender(bodyText?: string): { email: string; name: string } | undefined {
    if (!bodyText) return undefined;

    // Look for "From: Name <email@example.com>"
    const fromMatch = bodyText.match(/From:\s*(.+?)\s*<(.+?)>/i);
    if (fromMatch) {
      return {
        name: fromMatch[1].trim(),
        email: fromMatch[2].trim(),
      };
    }

    // Look for just email
    const emailMatch = bodyText.match(/From:\s*(.+@.+)/i);
    if (emailMatch) {
      return {
        email: emailMatch[1].trim(),
        name: '',
      };
    }

    return undefined;
  }

  /**
   * Extract email address from string
   */
  private extractEmail(emailString: string): string {
    const match = emailString.match(/<(.+?)>/);
    return match ? match[1] : emailString;
  }

  /**
   * Extract name from email string
   */
  private extractName(emailString: string): string {
    const match = emailString.match(/^(.+?)\s*</);
    return match ? match[1].replace(/['"]/g, '').trim() : '';
  }

  /**
   * Store inbound email in database
   */
  private async storeInboundEmail(
    userId: string,
    emailData: InboundEmailData,
    parsed: ParsedInboundEmail
  ): Promise<string> {
    const result = await query(
      `INSERT INTO inbound_emails (
        user_id, from_email, from_name, to_email, subject,
        body_text, body_html, message_id, in_reply_to, "references",
        processing_status, raw_data, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
      RETURNING id`,
      [
        userId,
        parsed.fromEmail,
        parsed.fromName,
        parsed.toEmail,
        parsed.subject,
        parsed.bodyText,
        parsed.bodyHtml,
        parsed.messageId,
        parsed.inReplyTo,
        parsed.references,
        'processing',
        JSON.stringify(emailData),
      ]
    );

    return result.rows[0].id;
  }

  /**
   * Update inbound email with client association
   */
  private async updateInboundEmailClient(inboundEmailId: string, clientId: string): Promise<void> {
    await query(
      `UPDATE inbound_emails SET client_id = $1, updated_at = NOW() WHERE id = $2`,
      [clientId, inboundEmailId]
    );
  }

  /**
   * Update inbound email processing status
   */
  private async updateInboundEmailStatus(
    inboundEmailId: string,
    status: string,
    errorMessage?: string | null,
    taskId?: string
  ): Promise<void> {
    await query(
      `UPDATE inbound_emails
       SET processing_status = $1, processed_at = NOW(), error_message = $2, task_id = $3, updated_at = NOW()
       WHERE id = $4`,
      [status, errorMessage, taskId, inboundEmailId]
    );
  }

  /**
   * Find or create client by email
   */
  private async findOrCreateClient(
    userId: string,
    clientEmail: string,
    clientName?: string
  ): Promise<string> {
    // Check if client exists
    const existing = await query(
      `SELECT id FROM clients WHERE user_id = $1 AND email = $2`,
      [userId, clientEmail]
    );

    if (existing.rows.length > 0) {
      // Update last_contact_date
      await query(
        `UPDATE clients
         SET last_contact_date = NOW(), email_count = email_count + 1, updated_at = NOW()
         WHERE id = $1`,
        [existing.rows[0].id]
      );
      return existing.rows[0].id;
    }

    // Create new client
    const result = await query(
      `INSERT INTO clients (
        user_id, email, name, first_contact_date, last_contact_date,
        email_count, status, created_at, updated_at
      ) VALUES ($1, $2, $3, NOW(), NOW(), 1, 'active', NOW(), NOW())
      RETURNING id`,
      [userId, clientEmail, clientName || clientEmail.split('@')[0]]
    );

    logger.info(`Created new client: ${clientEmail}`);

    return result.rows[0].id;
  }

  /**
   * Create task from extracted data
   */
  private async createTask(
    userId: string,
    clientId: string,
    task: any,
    inboundEmailId: string,
    parsed: ParsedInboundEmail
  ): Promise<string> {
    const result = await query(
      `INSERT INTO tasks (
        user_id, client_id, source_type, source_id, content, title,
        description, priority, priority_score, due_date, status,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
      RETURNING id`,
      [
        userId,
        clientId,
        'email',
        inboundEmailId,
        task.description || task.name,
        task.name || parsed.subject,
        task.description || parsed.bodyText.substring(0, 500),
        task.priority || 'medium',
        50, // priorityScore
        task.dueDate || null,
        'pending',
      ]
    );

    logger.info(`Created task: ${task.name || task.description}`);

    return result.rows[0].id;
  }

  /**
   * Create Trello card (if user has Trello connected)
   */
  private async createTrelloCard(
    userId: string,
    taskId: string,
    task: any,
    emailContext: { from: string; subject: string; date: Date }
  ): Promise<string | undefined> {
    try {
      // Get user's default board
      const boardResult = await query(
        `SELECT board_id FROM trello_boards WHERE user_id = $1 AND sync_enabled = true LIMIT 1`,
        [userId]
      );

      if (boardResult.rows.length === 0) {
        logger.info('User has no Trello boards connected');
        return undefined;
      }

      const boardId = boardResult.rows[0].board_id;

      // Get or create appropriate list
      const listResult = await query(
        `SELECT list_id FROM trello_lists WHERE board_id = (
          SELECT id FROM trello_boards WHERE board_id = $1
        ) AND (list_name ILIKE '%inbox%' OR list_name ILIKE '%to do%')
        LIMIT 1`,
        [boardId]
      );

      if (listResult.rows.length === 0) {
        logger.info('No suitable Trello list found');
        return undefined;
      }

      const listId = listResult.rows[0].list_id;

      // Create labels for priority and category
      const labelIds = await this.getOrCreateLabels(userId, boardId, task);

      // Ensure due date is set
      const dueDate = task.dueDate || this.getDefaultDueDate(task.priority);

      // Create description with context
      const description = `${task.description || task.name}\n\n---\nFrom Client: ${emailContext.from}\nRequested: ${emailContext.date.toLocaleDateString()}`;

      // Create card with labels and due date
      const card = await trelloService.createCard(userId, {
        name: task.name || task.description.substring(0, 100),
        desc: description,
        idList: listId,
        due: dueDate,
        pos: 'top',
        idLabels: labelIds,
      });

      // Add email context as a comment
      const emailLink = `From: ${emailContext.from}\nDate: ${emailContext.date.toISOString()}\nSubject: ${emailContext.subject}`;
      await trelloService.addComment(userId, card.id, emailLink);

      // Store card reference
      await query(
        `INSERT INTO trello_cards (
          task_id, card_id, board_id, list_id, card_name, card_url,
          synced_at, sync_status, created_at, updated_at
        ) VALUES ($1, $2, (SELECT id FROM trello_boards WHERE board_id = $3), $4, $5, $6, NOW(), 'synced', NOW(), NOW())`,
        [taskId, card.id, boardId, listId, card.name, card.url]
      );

      logger.info(`Created Trello card "${card.name}" with ${labelIds.length} labels and due date: ${dueDate}`);

      return card.id;
    } catch (error) {
      logger.error('Error creating Trello card:', error);
      throw error;
    }
  }

  /**
   * Get or create Trello labels for a task
   */
  private async getOrCreateLabels(
    userId: string,
    boardId: string,
    task: any
  ): Promise<string[]> {
    try {
      // Get existing board labels
      const existingLabels = await trelloService.getLabels(userId, boardId);
      const labelIds: string[] = [];

      // 1. Add priority label
      if (task.priority) {
        const priorityColor = this.getPriorityColor(task.priority);
        const priorityLabelName = `Priority: ${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}`;

        let priorityLabel = existingLabels.find(
          l => l.name === priorityLabelName && l.color === priorityColor
        );

        if (!priorityLabel) {
          priorityLabel = await trelloService.createLabel(userId, boardId, priorityLabelName, priorityColor);
          logger.info(`Created priority label: ${priorityLabelName}`);
        }

        labelIds.push(priorityLabel.id);
      }

      // 2. Add category label if present
      if (task.category) {
        const categoryLabelName = task.category.charAt(0).toUpperCase() + task.category.slice(1);
        let categoryLabel = existingLabels.find(l => l.name === categoryLabelName);

        if (!categoryLabel) {
          categoryLabel = await trelloService.createLabel(userId, boardId, categoryLabelName, 'blue');
          logger.info(`Created category label: ${categoryLabelName}`);
        }

        labelIds.push(categoryLabel.id);
      }

      return labelIds;
    } catch (error) {
      logger.warn('Failed to create labels, continuing without them:', error);
      return [];
    }
  }

  /**
   * Get priority color for Trello labels
   */
  private getPriorityColor(priority: string): string {
    const colorMap: { [key: string]: string } = {
      urgent: 'red',
      high: 'orange',
      medium: 'yellow',
      low: 'green',
    };
    return colorMap[priority.toLowerCase()] || 'blue';
  }

  /**
   * Get default due date based on priority
   */
  private getDefaultDueDate(priority: string): string {
    const now = new Date();
    const daysToAdd = priority === 'urgent' ? 1 : priority === 'high' ? 3 : priority === 'medium' ? 7 : 14;
    const dueDate = new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
    return dueDate.toISOString();
  }

  /**
   * Send confirmation email to user
   */
  private async sendConfirmationEmail(userId: string, clientName: string, taskTitle: string): Promise<void> {
    try {
      // Get user email
      const userResult = await query(`SELECT email FROM users WHERE id = $1`, [userId]);
      if (userResult.rows.length === 0) return;

      const userEmail = userResult.rows[0].email;

      await this.notificationService.sendEmail({
        to: userEmail,
        subject: '✅ Task created from email',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Task Created Successfully</h2>
            <p>We've processed an email from <strong>${clientName}</strong> and created a task:</p>
            <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin: 0;">${taskTitle}</h3>
            </div>
            <p>This task has been added to your TaskSnap dashboard and synced to Trello (if connected).</p>
            <a href="${config.appUrl}/dashboard" style="display: inline-block; margin: 20px 0; padding: 12px 24px; background: #4CAF50; color: white; text-decoration: none; border-radius: 6px;">
              View Dashboard
            </a>
            <p style="color: #888; font-size: 12px; margin-top: 30px;">
              This is an automated confirmation from TaskSnap.
            </p>
          </div>
        `,
      });
    } catch (error) {
      logger.error('Error sending confirmation email:', error);
      // Don't throw - confirmation email is not critical
    }
  }

  /**
   * Identify user from inbound email address
   * This can be enhanced with custom forwarding addresses or + addressing
   */
  async identifyUserFromEmail(toEmail: string): Promise<string | null> {
    try {
      // Method 1: Direct email match (user forwards from their registered email)
      const directMatch = await query(
        `SELECT id FROM users WHERE email = $1 AND is_active = true`,
        [toEmail]
      );

      if (directMatch.rows.length > 0) {
        return directMatch.rows[0].id;
      }

      // Method 2: Check for + addressing (e.g., user+tasksnap@gmail.com)
      const baseEmail = toEmail.split('+')[0] + '@' + toEmail.split('@')[1];
      const plusMatch = await query(
        `SELECT id FROM users WHERE email = $1 AND is_active = true`,
        [baseEmail]
      );

      if (plusMatch.rows.length > 0) {
        return plusMatch.rows[0].id;
      }

      // Method 3: Check for custom forwarding address in metadata (future enhancement)
      // This would require storing custom forwarding addresses in user_preferences

      logger.warn(`Could not identify user from email: ${toEmail}`);
      return null;
    } catch (error) {
      logger.error('Error identifying user from email:', error);
      return null;
    }
  }
}

export default InboundEmailService;
