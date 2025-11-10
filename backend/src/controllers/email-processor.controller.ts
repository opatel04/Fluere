import { Request, Response } from 'express';
import emailProcessorService from '../services/email-processor.service';
import aiService from '../services/ai.service';
import { asyncHandler } from '../middleware/errorHandler';
import { ValidationError } from '../types/errors';

/**
 * Email Processing Controller
 * Handles requests for Gmail → AI → Trello automation
 */

/**
 * Process a single email and create Trello cards
 * POST /api/v1/process/email/:messageId
 */
export const processEmail = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.body.userId || (req as any).session?.userId;
  const { messageId } = req.params;
  const { listId, boardId } = req.body;

  if (!userId) {
    throw new ValidationError('User ID is required');
  }

  if (!messageId) {
    throw new ValidationError('Message ID is required');
  }

  const result = await emailProcessorService.processEmailToTrello(
    userId,
    messageId,
    {
      listId,
      boardId,
    }
  );

  res.json({
    success: true,
    data: result,
  });
});

/**
 * Process multiple emails in batch
 * POST /api/v1/process/batch
 */
export const processBatch = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.body.userId || (req as any).session?.userId;
  const { maxEmails, query, labelIds, listId } = req.body;

  if (!userId) {
    throw new ValidationError('User ID is required');
  }

  const result = await emailProcessorService.processEmailsToTrello(userId, {
    maxEmails: parseInt(maxEmails) || 10,
    query,
    labelIds,
    listId,
  });

  res.json({
    success: true,
    data: result,
  });
});

/**
 * Test AI extraction on a sample email (without creating Trello cards)
 * POST /api/v1/process/test
 */
export const testExtraction = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { emailContent } = req.body;

  if (!emailContent) {
    throw new ValidationError('Email content is required');
  }

  const result = await aiService.processEmailWithValidation(emailContent, {
    enableValidation: true,
  });

  res.json({
    success: true,
    data: result,
  });
});

/**
 * Test full workflow (extraction + Trello card creation)
 * POST /api/v1/process/test/full
 */
export const testFullWorkflow = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { emailContent, userId, listId, boardId } = req.body;

  if (!emailContent) {
    throw new ValidationError('Email content is required');
  }

  if (!userId || !listId || !boardId) {
    throw new ValidationError('userId, listId, and boardId are required');
  }

  // Extract tasks using AI
  const extractionResult = await aiService.processEmailWithValidation(emailContent, {
    enableValidation: true,
  });

  if (!extractionResult.tasks || extractionResult.tasks.length === 0) {
    res.json({
      success: true,
      data: {
        message: 'No tasks extracted from email',
        extraction: extractionResult,
        cardsCreated: [],
      },
    });
    return;
  }

  // Create Trello cards for each task
  const createdCards = await emailProcessorService.createTrelloCards(
    userId,
    boardId,
    listId,
    extractionResult.tasks
  );

  res.json({
    success: true,
    data: {
      message: `Extracted ${extractionResult.tasks.length} tasks and created ${createdCards.length} Trello cards`,
      extraction: extractionResult,
      cardsCreated: createdCards,
    },
  });
});

/**
 * Quick extraction test (no validation layer)
 * POST /api/v1/process/test/quick
 */
export const testQuickExtraction = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { emailContent } = req.body;

  if (!emailContent) {
    throw new ValidationError('Email content is required');
  }

  const tasks = await aiService.extractTasksQuick(emailContent);

  res.json({
    success: true,
    data: {
      tasks,
      count: tasks.length,
    },
  });
});
