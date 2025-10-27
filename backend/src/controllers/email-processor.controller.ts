import { Request, Response, NextFunction } from 'express';
import emailProcessorService from '../services/email-processor.service';
import aiService from '../services/ai.service';
import logger from '../config/logger';

/**
 * Email Processing Controller
 * Handles requests for Gmail → AI → Trello automation
 */

/**
 * Process a single email and create Trello cards
 * POST /api/v1/process/email/:messageId
 */
export const processEmail = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.body.userId || (req as any).session?.userId;
    const { messageId } = req.params;
    const { listId, boardId } = req.body;

    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'User ID is required',
      });
      return;
    }

    if (!messageId) {
      res.status(400).json({
        success: false,
        error: 'Message ID is required',
      });
      return;
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
  } catch (error) {
    logger.error('Error in processEmail controller:', error);
    next(error);
  }
};

/**
 * Process multiple emails in batch
 * POST /api/v1/process/batch
 */
export const processBatch = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.body.userId || (req as any).session?.userId;
    const { maxEmails, query, labelIds, listId } = req.body;

    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'User ID is required',
      });
      return;
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
  } catch (error) {
    logger.error('Error in processBatch controller:', error);
    next(error);
  }
};

/**
 * Test AI extraction on a sample email (without creating Trello cards)
 * POST /api/v1/process/test
 */
export const testExtraction = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { emailContent } = req.body;

    if (!emailContent) {
      res.status(400).json({
        success: false,
        error: 'Email content is required',
      });
      return;
    }

    const result = await aiService.processEmailWithValidation(emailContent, {
      enableValidation: true,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error in testExtraction controller:', error);
    next(error);
  }
};

/**
 * Test full workflow (extraction + Trello card creation)
 * POST /api/v1/process/test/full
 */
export const testFullWorkflow = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { emailContent, userId, listId, boardId } = req.body;

    if (!emailContent) {
      res.status(400).json({
        success: false,
        error: 'Email content is required',
      });
      return;
    }

    if (!userId || !listId || !boardId) {
      res.status(400).json({
        success: false,
        error: 'userId, listId, and boardId are required',
      });
      return;
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
  } catch (error) {
    logger.error('Error in testFullWorkflow controller:', error);
    next(error);
  }
};

/**
 * Quick extraction test (no validation layer)
 * POST /api/v1/process/test/quick
 */
export const testQuickExtraction = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { emailContent } = req.body;

    if (!emailContent) {
      res.status(400).json({
        success: false,
        error: 'Email content is required',
      });
      return;
    }

    const tasks = await aiService.extractTasksQuick(emailContent);

    res.json({
      success: true,
      data: {
        tasks,
        count: tasks.length,
      },
    });
  } catch (error) {
    logger.error('Error in testQuickExtraction controller:', error);
    next(error);
  }
};
