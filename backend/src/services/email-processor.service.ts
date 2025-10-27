import gmailService from './gmail.service';
import trelloService from './trello.service';
import aiService from './ai.service';
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

      // Step 1: Fetch email from Gmail
      const emails = await gmailService.fetchEmails(userId, {
        maxResults: 1,
        query: `rfc822msgid:${messageId}`,
      });

      if (emails.messages.length === 0) {
        throw new Error(`Email ${messageId} not found`);
      }

      const email = gmailService.parseEmail(emails.messages[0]);

      // Step 2: Extract tasks using layered AI approach
      const emailContent = this.formatEmailForAI(email);

      const extraction = await aiService.processEmailWithValidation(
        emailContent,
        options?.processingOptions
      );

      logger.info(
        `Extracted ${extraction.tasks.length} tasks with ${(extraction.confidence * 100).toFixed(1)}% confidence`
      );

      // Step 3: Create Trello cards from tasks
      const cardsCreated: string[] = [];
      const issues: string[] = [];

      for (const task of extraction.tasks) {
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
    // If no list specified, get the first list from the first board
    let boardId: string;
    if (!listId) {
      const boards = await trelloService.getBoards(userId);
      if (boards.length === 0) {
        throw new Error('No Trello boards found');
      }

      boardId = boards[0].id;
      const lists = await trelloService.getLists(userId, boardId);
      if (lists.length === 0) {
        throw new Error('No lists found in board');
      }

      listId = lists[0].id;
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
