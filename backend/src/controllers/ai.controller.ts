import { Request, Response } from 'express';
import aiService from '../services/ai.service';
import logger from '../config/logger';
import { query } from '../config/database';
import { TaskContext, PriorityListKeywords, AIModels, ValidationMessages, ApiMessages } from '../config/constants';
import { asyncHandler } from '../middleware/errorHandler';
import { ValidationError } from '../types/errors';

/**
 * Manual task extraction (chatbot/manual input feature)
 * POST /api/v1/ai/extract-manual
 *
 * Accepts manual text input and returns task suggestions WITHOUT auto-creating them
 */
export const extractManualTasks = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  // userId is guaranteed by extractUserId middleware
  const userId = (req as any).userId;
  const { text, context } = req.body;

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    throw new ValidationError(ValidationMessages.TEXT_REQUIRED);
  }

  // Validate context type
  const validContexts = Object.values(TaskContext);
  const textContext = context || TaskContext.GENERAL_NOTES;

  if (!validContexts.includes(textContext)) {
    throw new ValidationError(ValidationMessages.INVALID_CONTEXT);
  }

  logger.info('Manual task extraction requested', {
    userId,
    textLength: text.length,
    context: textContext,
  });

  // Extract tasks using AI service
  const result = await aiService.processEmailWithValidation(text, {
    primaryModel: AIModels.FAST, // Use faster model for manual extraction
    enableValidation: false, // Skip validation for speed
  });

  // Get user's Trello boards and lists for suggestions
  const boards = await query(
    `SELECT DISTINCT
      tb.board_id as trello_board_id,
      tb.board_name,
      tl.list_name,
      tl.list_id as trello_list_id
     FROM trello_boards tb
     LEFT JOIN trello_lists tl ON tb.id = tl.board_id
     WHERE tb.user_id = $1
     ORDER BY tb.board_name, tl.list_name`,
    [userId]
  );

  // Get user's clients for association
  const clients = await query(
    `SELECT id, name, email
     FROM clients
     WHERE user_id = $1
     ORDER BY name`,
    [userId]
  );

  // Build task suggestions with board/list suggestions
  const taskSuggestions = result.tasks.map((task: any, index: number) => {
    // Simple board suggestion logic (can be enhanced with AI)
    let suggestedBoard = null;
    let suggestedList = null;

    if (boards.rows.length > 0) {
      // Default to first board
      suggestedBoard = {
        id: boards.rows[0].trello_board_id,
        name: boards.rows[0].board_name,
      };

      // Try to match list based on task priority or keywords using constants
      const priority = task.priority?.toLowerCase() || 'medium';
      const keywords = (PriorityListKeywords as any)[priority] || [];

      // Find matching list
      const matchingList = boards.rows.find((board: any) =>
        keywords.some((keyword: string) =>
          board.list_name?.toLowerCase().includes(keyword)
        )
      );

      if (matchingList) {
        suggestedList = {
          id: matchingList.trello_list_id,
          name: matchingList.list_name,
          boardId: matchingList.trello_board_id,
          boardName: matchingList.board_name,
        };
      } else {
        // Default to first list of first board
        suggestedList = {
          id: boards.rows[0].trello_list_id,
          name: boards.rows[0].list_name,
          boardId: boards.rows[0].trello_board_id,
          boardName: boards.rows[0].board_name,
        };
      }
    }

    return {
      id: `temp-${Date.now()}-${index}`, // Temporary ID for UI
      title: task.title,
      description: task.description,
      dueDate: task.dueDate,
      priority: task.priority,
      labels: task.labels,
      suggestedBoard,
      suggestedList,
      status: 'suggested', // Not created yet
    };
  });

  res.json({
    success: true,
    message: `Extracted ${taskSuggestions.length} task suggestion${taskSuggestions.length !== 1 ? 's' : ''}`,
    data: {
      tasks: taskSuggestions,
      availableBoards: boards.rows.map((row: any) => ({
        id: row.trello_board_id,
        name: row.board_name,
        lists: boards.rows
          .filter((b: any) => b.trello_board_id === row.trello_board_id)
          .map((b: any) => ({
            id: b.trello_list_id,
            name: b.list_name,
          })),
      })),
      availableClients: clients.rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        email: row.email,
      })),
      context: textContext,
      confidence: result.confidence,
    },
  });

  logger.info('Manual task extraction completed', {
    userId,
    tasksExtracted: taskSuggestions.length,
    confidence: result.confidence,
  });
});

/**
 * Accept suggested tasks and create them in Trello
 * POST /api/v1/ai/accept-tasks
 */
export const acceptSuggestedTasks = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  // userId is guaranteed by extractUserId middleware
  const userId = (req as any).userId;
  const { tasks } = req.body;

  if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
    throw new ValidationError(ValidationMessages.TASKS_REQUIRED);
  }

  logger.info('Task acceptance requested', {
    userId,
    taskCount: tasks.length,
  });

  // TODO: Create tasks in Trello and database
  // For now, just save to database without Trello integration
  const createdTasks = [];

  for (const task of tasks) {
    // Individual task creation - errors caught and logged but don't stop batch
    try {
      const result = await query(
        `INSERT INTO tasks (
          user_id, title, description, due_date, priority,
          trello_board_id, trello_list_id, trello_card_id,
          client_id, source, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
        RETURNING *`,
        [
          userId,
          task.title,
          task.description || null,
          task.dueDate || null,
          task.priority || 'medium',
          task.boardId || null,
          task.listId || null,
          null, // trello_card_id - will be set when synced to Trello
          task.clientId || null,
          'manual_input',
          'pending',
        ]
      );

      createdTasks.push(result.rows[0]);

      logger.info('Task created from manual input', {
        userId,
        taskId: result.rows[0].id,
        title: task.title,
      });
    } catch (error) {
      logger.error('Error creating task from manual input', {
        userId,
        task,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Continue with other tasks even if one fails
    }
  }

  res.json({
    success: true,
    message: ApiMessages.TASKS_ACCEPTED,
    data: {
      tasks: createdTasks,
      created: createdTasks.length,
      requested: tasks.length,
    },
  });

  logger.info('Task acceptance completed', {
    userId,
    tasksCreated: createdTasks.length,
  });
});

/**
 * Reject/dismiss suggested tasks
 * POST /api/v1/ai/reject-tasks
 */
export const rejectSuggestedTasks = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  // userId is guaranteed by extractUserId middleware
  const userId = (req as any).userId;
  const { taskIds, reason } = req.body;

  if (!taskIds || !Array.isArray(taskIds)) {
    throw new ValidationError('taskIds array is required');
  }

  logger.info('Task rejection requested', {
    userId,
    taskCount: taskIds.length,
    reason,
  });

  // Log rejection for analytics
  // TODO: Could store rejections for improving AI extraction

  res.json({
    success: true,
    message: ApiMessages.TASKS_REJECTED,
  });
});

/**
 * Edit suggested task before accepting
 * PUT /api/v1/ai/edit-suggestion/:tempId
 */
export const editSuggestedTask = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  // userId is guaranteed by extractUserId middleware
  const userId = (req as any).userId;
  const { tempId } = req.params;
  const { title, description, dueDate, priority, boardId, listId, clientId } = req.body;

  // This is just for the frontend state - no database changes yet
  // Tasks are only saved when user accepts them

  res.json({
    success: true,
    message: ApiMessages.SUGGESTION_UPDATED,
    data: {
      id: tempId,
      title,
      description,
      dueDate,
      priority,
      boardId,
      listId,
      clientId,
    },
  });
});
