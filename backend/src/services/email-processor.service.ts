import gmailService from './gmail.service';
import trelloService from './trello.service';
import aiService from './ai.service';
import taskIntelligenceService from './task-intelligence.service';
import boardAutomationService from './board-automation.service';
import db from '../config/database';
import logger from '../config/logger';
import { ExtractedTask, ProcessingOptions } from '../types/ai.types';

/**
 * Email Processing Service
 * Orchestrates the flow: Gmail → AI → Trello
 *
 * This service implements the layered AI approach:
 * 1. Fetch emails from Gmail
 * 2. Extract tasks using GPT-4o (with Gemini fallback for long emails)
 * 3. Validate extraction using GPT-4o-mini
 * 4. Re-extract if needed
 * 5. Create Trello cards from extracted tasks
 */
class EmailProcessorService {
  /**
   * Process a single email and create Trello cards
   */
  async processEmailToTrello(
    userId: string,
    messageId: string,
    options?: {
      boardId?: string;
      listId?: string;
      processingOptions?: ProcessingOptions;
    }
  ): Promise<{
    success: boolean;
    tasksExtracted: number;
    cardsCreated: number;
    confidence: number;
    issues?: string[];
  }> {
    const startTime = Date.now();

    try {
      logger.info(`Processing email ${messageId} for user ${userId}`);

      // Step 1: Fetch email from Gmail by its Gmail message ID
      const emailMessage = await gmailService.getEmailById(userId, messageId);

      if (!emailMessage) {
        throw new Error(`Email ${messageId} not found`);
      }

      const email = gmailService.parseEmail(emailMessage);

      // Step 2: Extract tasks using layered AI approach
      const emailContent = this.formatEmailForAI(email);

      const extraction = await aiService.processEmailWithValidation(
        emailContent,
        options?.processingOptions
      );

      logger.info(
        `Extracted ${extraction.tasks.length} tasks with ${(extraction.confidence * 100).toFixed(1)}% confidence`
      );

      // Step 3: Apply task intelligence (sorting, labeling, enrichment)
      logger.info('Applying task intelligence: sorting, labeling, and enrichment...');
      const enrichedTasks = extraction.tasks.map(task => taskIntelligenceService.enrichTask(task));
      const sortedTasks = taskIntelligenceService.sortTasks(enrichedTasks);
      const taskSummary = taskIntelligenceService.generateTaskSummary(sortedTasks);

      logger.info('Task Intelligence Applied:', {
        totalTasks: taskSummary.total,
        urgent: taskSummary.urgent,
        dueToday: taskSummary.dueToday,
        byPriority: taskSummary.byPriority,
        estimatedTime: `${taskSummary.estimatedTotalTime} minutes`,
      });

      // Step 4: Create Trello cards from intelligently sorted tasks
      const cardsCreated: string[] = [];
      const issues: string[] = [];

      for (const task of sortedTasks) {
        try {
          const card = await this.createTrelloCardFromTask(
            userId,
            task,
            email,
            options?.listId
          );

          cardsCreated.push(card.id);

          logger.info(`Created Trello card: ${card.name} (${card.id})`);
        } catch (error) {
          const errorMsg = `Failed to create card for task: ${task.name}`;
          logger.error(errorMsg, error);
          issues.push(errorMsg);
        }
      }

      const processingTime = Date.now() - startTime;

      logger.info(
        `Email processing complete: ${cardsCreated.length}/${extraction.tasks.length} cards created in ${processingTime}ms`
      );

      return {
        success: cardsCreated.length > 0,
        tasksExtracted: extraction.tasks.length,
        cardsCreated: cardsCreated.length,
        confidence: extraction.confidence,
        issues: issues.length > 0 ? issues : undefined,
      };
    } catch (error) {
      logger.error('Error processing email to Trello:', error);
      throw new Error('Failed to process email');
    }
  }

  /**
   * FAST: Process email to pending queue WITHOUT AI (Option B - lazy loading)
   * Just stores email metadata with heuristic-based priority
   * Description is generated on-demand when user clicks
   */
  async processEmailToPendingFast(
    userId: string,
    messageId: string
  ): Promise<{
    success: boolean;
    taskSaved: boolean;
    taskId?: string;
  }> {
    const startTime = Date.now();

    try {
      logger.info(`Fast processing email ${messageId} for user ${userId}`);

      // Step 1: Fetch email from Gmail
      const emailMessage = await gmailService.getEmailById(userId, messageId);

      if (!emailMessage) {
        throw new Error(`Email ${messageId} not found`);
      }

      const email = gmailService.parseEmail(emailMessage);

      // Step 2: Check if already processed
      const existing = await db.query(
        `SELECT id FROM pending_tasks WHERE email_id = $1 AND user_id = $2`,
        [messageId, userId]
      );

      if (existing.rows.length > 0) {
        logger.info(`Email ${messageId} already processed, skipping`);
        return { success: true, taskSaved: false };
      }

      // Step 3: Detect priority using heuristics (NO AI)
      const priority = this.detectPriorityFromEmail(email);
      const labels = this.detectLabelsFromEmail(email);
      const dueDate = this.detectDueDateFromEmail(email);

      // Step 4: Save to pending_tasks (description is NULL - generated on-demand)
      const result = await db.query(
        `INSERT INTO pending_tasks (
          user_id, email_id, email_subject, email_from, email_date,
          title, description, snippet, priority, category, due_date,
          labels, confidence, extraction_source, status, ai_processed
        ) VALUES ($1, $2, $3, $4, $5, $6, NULL, $7, $8, $9, $10, $11, NULL, 'automation', 'pending', false)
        RETURNING id`,
        [
          userId,
          messageId,
          email.subject,
          email.from,
          email.date,
          email.subject, // title = subject initially
          email.snippet || email.body?.substring(0, 200) || '',
          priority,
          null, // category set by AI later
          dueDate,
          JSON.stringify(labels),
        ]
      );

      const processingTime = Date.now() - startTime;
      logger.info(`Fast processed email ${messageId} in ${processingTime}ms`);

      return {
        success: true,
        taskSaved: true,
        taskId: result.rows[0].id,
      };
    } catch (error) {
      logger.error('Error in fast email processing:', error);
      throw new Error('Failed to process email');
    }
  }

  /**
   * Detect priority from email using heuristics (no AI)
   */
  private detectPriorityFromEmail(email: any): string {
    const subject = (email.subject || '').toLowerCase();
    const snippet = (email.snippet || '').toLowerCase();
    const combined = `${subject} ${snippet}`;

    // Urgent indicators
    const urgentPatterns = [
      /urgent/i, /asap/i, /immediately/i, /critical/i, /emergency/i,
      /time.?sensitive/i, /action.?required/i, /respond.?today/i,
      /deadline.?today/i, /due.?today/i, /expires?.?today/i,
    ];

    // High priority indicators
    const highPatterns = [
      /important/i, /priority/i, /reminder/i, /follow.?up/i,
      /deadline/i, /due.?date/i, /assignment/i, /graded/i,
      /action.?needed/i, /please.?review/i, /waiting.?for/i,
    ];

    // Low priority indicators (promotional, etc)
    const lowPatterns = [
      /sale/i, /discount/i, /off\s/i, /% off/i, /promo/i,
      /newsletter/i, /unsubscribe/i, /deal/i, /offer/i,
      /black.?friday/i, /cyber.?monday/i, /limited.?time/i,
    ];

    for (const pattern of urgentPatterns) {
      if (pattern.test(combined)) return 'urgent';
    }

    for (const pattern of highPatterns) {
      if (pattern.test(combined)) return 'high';
    }

    for (const pattern of lowPatterns) {
      if (pattern.test(combined)) return 'low';
    }

    return 'medium';
  }

  /**
   * Detect labels from email using heuristics
   */
  private detectLabelsFromEmail(email: any): string[] {
    const subject = (email.subject || '').toLowerCase();
    const from = (email.from || '').toLowerCase();
    const labels: string[] = [];

    // Academic
    if (/assignment|graded|course|class|professor|edu/i.test(`${subject} ${from}`)) {
      labels.push('Academic');
    }

    // Shopping/Promotional
    if (/sale|discount|order|shipping|delivery|shop/i.test(subject)) {
      labels.push('Shopping');
    }

    // Work
    if (/meeting|project|deadline|review|report/i.test(subject)) {
      labels.push('Work');
    }

    // Finance
    if (/payment|invoice|receipt|bank|credit|bill/i.test(subject)) {
      labels.push('Finance');
    }

    return labels;
  }

  /**
   * Detect due date from email using heuristics
   */
  private detectDueDateFromEmail(email: any): string | null {
    const subject = (email.subject || '').toLowerCase();
    const snippet = (email.snippet || '').toLowerCase();
    const combined = `${subject} ${snippet}`;

    // Today patterns
    if (/today|ends?.?today|due.?today|expires?.?today/i.test(combined)) {
      return new Date().toISOString();
    }

    // Tomorrow patterns
    if (/tomorrow|due.?tomorrow/i.test(combined)) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow.toISOString();
    }

    // This week patterns
    if (/this.?week|end.?of.?week/i.test(combined)) {
      const endOfWeek = new Date();
      endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()));
      return endOfWeek.toISOString();
    }

    return null;
  }

  /**
   * Generate AI description on-demand for a pending task
   */
  async generateTaskDescription(
    userId: string,
    taskId: string
  ): Promise<{
    success: boolean;
    description?: string;
    category?: string;
    priority?: string;
    dueDate?: string;
  }> {
    try {
      // Get the task and its email
      const taskResult = await db.query(
        `SELECT * FROM pending_tasks WHERE id = $1 AND user_id = $2`,
        [taskId, userId]
      );

      if (taskResult.rows.length === 0) {
        throw new Error('Task not found');
      }

      const task = taskResult.rows[0];

      // If already processed, return existing data
      if (task.ai_processed && task.description) {
        return {
          success: true,
          description: task.description,
          category: task.category,
          priority: task.priority,
          dueDate: task.due_date,
        };
      }

      // Fetch the original email
      const emailMessage = await gmailService.getEmailById(userId, task.email_id);
      if (!emailMessage) {
        throw new Error('Original email not found');
      }

      const email = gmailService.parseEmail(emailMessage);
      const emailContent = this.formatEmailForAI(email);

      // Process with AI
      const extraction = await aiService.processEmailWithValidation(emailContent);

      // Get the best task from extraction (or create one from email)
      const extractedTask = extraction.tasks[0] || {
        name: email.subject,
        description: `From: ${email.from}\n\n${email.body?.substring(0, 500) || email.snippet}`,
        priority: task.priority,
        category: null,
        dueDate: task.due_date,
      };

      // Update the task with AI-generated data
      await db.query(
        `UPDATE pending_tasks SET
          title = COALESCE($1, title),
          description = $2,
          priority = COALESCE($3, priority),
          category = $4,
          due_date = COALESCE($5, due_date),
          ai_processed = true,
          confidence = $6,
          updated_at = NOW()
        WHERE id = $7`,
        [
          extractedTask.name,
          extractedTask.description,
          extractedTask.priority,
          extractedTask.category || null,
          extractedTask.dueDate || null,
          extraction.confidence,
          taskId,
        ]
      );

      logger.info(`Generated AI description for task ${taskId}`);

      return {
        success: true,
        description: extractedTask.description,
        category: extractedTask.category,
        priority: extractedTask.priority,
        dueDate: extractedTask.dueDate,
      };
    } catch (error) {
      logger.error('Error generating task description:', error);
      throw new Error('Failed to generate description');
    }
  }

  /**
   * Process a single email and save tasks to pending queue (for approval workflow)
   * Instead of creating Trello cards directly, saves extracted tasks to pending_tasks table
   * NOTE: This is the SLOW method with full AI processing - use processEmailToPendingFast for speed
   */
  async processEmailToPending(
    userId: string,
    messageId: string,
    options?: {
      processingOptions?: ProcessingOptions;
    }
  ): Promise<{
    success: boolean;
    tasksExtracted: number;
    tasksSaved: number;
    confidence: number;
    issues?: string[];
  }> {
    const startTime = Date.now();

    try {
      logger.info(`Processing email ${messageId} to pending queue for user ${userId}`);

      // Step 1: Fetch email from Gmail by its Gmail message ID
      const emailMessage = await gmailService.getEmailById(userId, messageId);

      if (!emailMessage) {
        throw new Error(`Email ${messageId} not found`);
      }

      const email = gmailService.parseEmail(emailMessage);

      // Step 2: Extract tasks using layered AI approach
      const emailContent = this.formatEmailForAI(email);

      const extraction = await aiService.processEmailWithValidation(
        emailContent,
        options?.processingOptions
      );

      logger.info(
        `Extracted ${extraction.tasks.length} tasks with ${(extraction.confidence * 100).toFixed(1)}% confidence`
      );

      if (extraction.tasks.length === 0) {
        return {
          success: true,
          tasksExtracted: 0,
          tasksSaved: 0,
          confidence: extraction.confidence,
        };
      }

      // Step 3: Apply task intelligence (sorting, labeling, enrichment)
      const enrichedTasks = extraction.tasks.map(task => taskIntelligenceService.enrichTask(task));
      const sortedTasks = taskIntelligenceService.sortTasks(enrichedTasks);

      // Step 4: Save tasks to pending_tasks table
      const savedTasks: string[] = [];
      const issues: string[] = [];

      for (const task of sortedTasks) {
        try {
          // Ensure task has a valid title (fallback to description snippet or email subject)
          const taskTitle = task.name || task.description?.substring(0, 100) || email.subject || 'Untitled Task';

          const result = await db.query(
            `INSERT INTO pending_tasks (
              user_id, email_id, email_subject, email_from, email_date,
              title, description, priority, category, due_date, estimated_time,
              labels, confidence, extraction_source, status, ai_processed
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'automation', 'pending', true)
            RETURNING id`,
            [
              userId,
              messageId,
              email.subject,
              email.from,
              email.date,
              taskTitle,
              task.description || null,
              task.priority || 'medium',
              task.category || null,
              task.dueDate || this.getDefaultDueDate(task.priority || 'medium'),
              task.estimatedTime || null,
              JSON.stringify(task.labels || []),
              extraction.confidence,
            ]
          );

          savedTasks.push(result.rows[0].id);
          logger.info(`Saved pending task: ${taskTitle} (${result.rows[0].id})`);
        } catch (error) {
          const errorMsg = `Failed to save pending task: ${task.name}`;
          logger.error(errorMsg, error);
          issues.push(errorMsg);
        }
      }

      const processingTime = Date.now() - startTime;

      logger.info(
        `Email processing to pending complete: ${savedTasks.length}/${extraction.tasks.length} tasks saved in ${processingTime}ms`
      );

      return {
        success: savedTasks.length > 0,
        tasksExtracted: extraction.tasks.length,
        tasksSaved: savedTasks.length,
        confidence: extraction.confidence,
        issues: issues.length > 0 ? issues : undefined,
      };
    } catch (error) {
      logger.error('Error processing email to pending:', error);
      throw new Error('Failed to process email to pending queue');
    }
  }

  /**
   * Process multiple emails in batch to pending queue
   */
  async processEmailsToPending(
    userId: string,
    options?: {
      maxEmails?: number;
      query?: string;
      labelIds?: string[];
      processingOptions?: ProcessingOptions;
    }
  ): Promise<{
    emailsProcessed: number;
    totalTasksExtracted: number;
    totalTasksSaved: number;
    averageConfidence: number;
    errors: string[];
  }> {
    try {
      logger.info(`Starting batch email processing to pending for user ${userId}`);

      // Fetch emails from Gmail
      const emails = await gmailService.fetchEmails(userId, {
        maxResults: options?.maxEmails || 10,
        query: options?.query,
        labelIds: options?.labelIds || ['INBOX'],
      });

      const results = {
        emailsProcessed: 0,
        totalTasksExtracted: 0,
        totalTasksSaved: 0,
        totalConfidence: 0,
        errors: [] as string[],
      };

      // Process each email
      for (const emailMessage of emails.messages) {
        try {
          const result = await this.processEmailToPending(
            userId,
            emailMessage.id,
            {
              processingOptions: options?.processingOptions,
            }
          );

          results.emailsProcessed++;
          results.totalTasksExtracted += result.tasksExtracted;
          results.totalTasksSaved += result.tasksSaved;
          results.totalConfidence += result.confidence;

          if (result.issues) {
            results.errors.push(...result.issues);
          }
        } catch (error) {
          const errorMsg = `Failed to process email ${emailMessage.id}`;
          logger.error(errorMsg, error);
          results.errors.push(errorMsg);
        }
      }

      return {
        ...results,
        averageConfidence:
          results.emailsProcessed > 0
            ? results.totalConfidence / results.emailsProcessed
            : 0,
      };
    } catch (error) {
      logger.error('Error in batch email processing to pending:', error);
      throw new Error('Failed to process emails to pending queue');
    }
  }

  /**
   * Process multiple emails in batch
   */
  async processEmailsToTrello(
    userId: string,
    options?: {
      maxEmails?: number;
      query?: string;
      labelIds?: string[];
      listId?: string;
      processingOptions?: ProcessingOptions;
    }
  ): Promise<{
    emailsProcessed: number;
    totalTasksExtracted: number;
    totalCardsCreated: number;
    averageConfidence: number;
    errors: string[];
  }> {
    try {
      logger.info(`Starting batch email processing for user ${userId}`);

      // Fetch emails from Gmail
      const emails = await gmailService.fetchEmails(userId, {
        maxResults: options?.maxEmails || 10,
        query: options?.query,
        labelIds: options?.labelIds || ['INBOX'],
      });

      const results = {
        emailsProcessed: 0,
        totalTasksExtracted: 0,
        totalCardsCreated: 0,
        totalConfidence: 0,
        errors: [] as string[],
      };

      // Process each email
      for (const emailMessage of emails.messages) {
        try {
          const result = await this.processEmailToTrello(
            userId,
            emailMessage.id,
            {
              listId: options?.listId,
              processingOptions: options?.processingOptions,
            }
          );

          results.emailsProcessed++;
          results.totalTasksExtracted += result.tasksExtracted;
          results.totalCardsCreated += result.cardsCreated;
          results.totalConfidence += result.confidence;

          if (result.issues) {
            results.errors.push(...result.issues);
          }
        } catch (error) {
          const errorMsg = `Failed to process email ${emailMessage.id}`;
          logger.error(errorMsg, error);
          results.errors.push(errorMsg);
        }
      }

      return {
        ...results,
        averageConfidence:
          results.emailsProcessed > 0
            ? results.totalConfidence / results.emailsProcessed
            : 0,
      };
    } catch (error) {
      logger.error('Error in batch email processing:', error);
      throw new Error('Failed to process emails in batch');
    }
  }

  /**
   * Create Trello card from extracted task
   */
  private async createTrelloCardFromTask(
    userId: string,
    task: ExtractedTask,
    emailContext: any,
    listId?: string
  ): Promise<any> {
    // If no list specified, determine board and list using automation rules
    let boardId: string;
    if (!listId) {
      const boards = await trelloService.getBoards(userId);
      if (boards.length === 0) {
        throw new Error('No Trello boards found');
      }

      boardId = boards[0].id;

      // Initialize board with configured lists (creates missing lists)
      try {
        const initResult = await boardAutomationService.initializeBoard(userId, boardId);
        if (initResult.listsCreated.length > 0) {
          logger.info(`Initialized board ${boardId}: created ${initResult.listsCreated.length} lists`);
        }
      } catch (error) {
        logger.warn('Failed to initialize board, continuing with existing lists:', error);
      }

      // Route task to appropriate list based on configured rules
      try {
        const routing = await boardAutomationService.routeTask(userId, boardId, task);

        if (routing.listId) {
          listId = routing.listId;
          logger.info(`Routed task "${task.name}" to list "${routing.listName}" (rule: ${routing.matchedRule || 'default'})`);
        } else {
          // List doesn't exist, try to find or create it
          const targetList = await trelloService.findOrCreateList(userId, boardId, routing.listName);
          listId = targetList.id;
          logger.info(`Created/found list "${routing.listName}" for task "${task.name}"`);
        }
      } catch (error) {
        logger.warn('Failed to route task using automation rules, using default list:', error);

        // Fallback to first list
        const lists = await trelloService.getLists(userId, boardId);
        if (lists.length === 0) {
          throw new Error('No lists found in board');
        }
        listId = lists[0].id;
      }
    } else {
      // Get board ID from list
      const list = await trelloService.getList(userId, listId);
      boardId = list.idBoard;
    }

    // Build card description with context
    const description = this.buildCardDescription(task, emailContext);

    // Get or create Trello labels for this task
    const labelIds = await this.getOrCreateLabels(userId, boardId, task);

    // Ensure due date is always set
    const dueDate = task.dueDate || this.getDefaultDueDate(task.priority);

    // Create the card with labels and due date
    const card = await trelloService.createCard(userId, {
      name: task.name,
      desc: description,
      idList: listId,
      due: dueDate,
      pos: 'top',
      idLabels: labelIds,
    });

    // Add email context as a comment
    const emailLink = `From: ${emailContext.from}\nDate: ${emailContext.date}\nSubject: ${emailContext.subject}`;
    await trelloService.addComment(userId, card.id, emailLink);

    logger.info(`Created card "${card.name}" with ${labelIds.length} labels and due date: ${dueDate}`);

    return card;
  }

  /**
   * Get or create Trello labels for a task
   */
  private async getOrCreateLabels(
    userId: string,
    boardId: string,
    task: ExtractedTask
  ): Promise<string[]> {
    try {
      // Get existing board labels
      const existingLabels = await trelloService.getLabels(userId, boardId);

      const labelIds: string[] = [];

      // 1. Add priority label
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

      // 3. Add custom labels from AI extraction
      if (task.labels && task.labels.length > 0) {
        for (const labelName of task.labels.slice(0, 3)) { // Limit to 3 custom labels
          let customLabel = existingLabels.find(l => l.name === labelName);

          if (!customLabel) {
            customLabel = await trelloService.createLabel(userId, boardId, labelName, 'purple');
            logger.info(`Created custom label: ${labelName}`);
          }

          labelIds.push(customLabel.id);
        }
      }

      return labelIds;
    } catch (error) {
      logger.error('Error getting/creating labels:', error);
      // Return empty array if label creation fails - card will still be created
      return [];
    }
  }

  /**
   * Get default due date based on priority if none is specified
   */
  private getDefaultDueDate(priority: string): string {
    const now = new Date();

    switch (priority) {
      case 'urgent':
        // Due today
        return now.toISOString();
      case 'high':
        // Due in 3 days
        now.setDate(now.getDate() + 3);
        return now.toISOString();
      case 'medium':
        // Due in 1 week
        now.setDate(now.getDate() + 7);
        return now.toISOString();
      case 'low':
      default:
        // Due in 2 weeks
        now.setDate(now.getDate() + 14);
        return now.toISOString();
    }
  }

  /**
   * Format email for AI processing
   */
  private formatEmailForAI(email: any): string {
    return `
Subject: ${email.subject}
From: ${email.from}
To: ${email.to}
Date: ${email.date}

${email.body}

---
Snippet: ${email.snippet}
`.trim();
  }

  /**
   * Build detailed card description
   */
  private buildCardDescription(task: ExtractedTask, emailContext: any): string {
    let description = task.description;

    // Add priority indicator
    const priorityEmoji = {
      urgent: '🔴',
      high: '🟠',
      medium: '🟡',
      low: '🟢',
    };
    description = `${priorityEmoji[task.priority]} **Priority: ${task.priority.toUpperCase()}**\n\n${description}`;

    // Add category if present
    if (task.category) {
      description += `\n\n**Category:** ${task.category}`;
    }

    // Add estimated time if present
    if (task.estimatedTime) {
      description += `\n**Estimated Time:** ${task.estimatedTime}`;
    }

    // Add labels if present
    if (task.labels && task.labels.length > 0) {
      description += `\n**Labels:** ${task.labels.join(', ')}`;
    }

    // Add source info
    description += `\n\n---\n📧 **Created from email**\nFrom: ${emailContext.from}\nDate: ${emailContext.date}`;

    return description;
  }

  /**
   * Get Trello label color for priority
   */
  private getPriorityColor(priority: string): string {
    const colorMap: Record<string, string> = {
      urgent: 'red',
      high: 'orange',
      medium: 'yellow',
      low: 'green',
    };

    return colorMap[priority] || 'blue';
  }

  /**
   * Public method to create multiple Trello cards from extracted tasks
   */
  async createTrelloCards(
    userId: string,
    boardId: string,
    listId: string,
    tasks: ExtractedTask[]
  ): Promise<any[]> {
    try {
      const createdCards = [];
      const emailContext = {
        from: 'Test Email',
        date: new Date().toISOString(),
        subject: 'Automated Task Creation',
      };

      for (const task of tasks) {
        try {
          const card = await this.createTrelloCardFromTask(
            userId,
            task,
            emailContext,
            listId
          );
          createdCards.push(card);
        } catch (error) {
          logger.error(`Failed to create card for task "${task.name}":`, error);
          // Continue with other tasks even if one fails
        }
      }

      logger.info(`Created ${createdCards.length} of ${tasks.length} Trello cards`);
      return createdCards;
    } catch (error) {
      logger.error('Error creating Trello cards:', error);
      throw new Error('Failed to create Trello cards');
    }
  }
}

export default new EmailProcessorService();
