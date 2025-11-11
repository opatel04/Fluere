import { Request, Response } from 'express';
import trelloService from '../services/trello.service';
import logger from '../config/logger';
import { asyncHandler } from '../middleware/errorHandler';
import { successResponse, successWithCount, createdResponse, listResponse } from '../utils/responses';
import { ValidationError } from '../types/errors';

/**
 * Simple Board Setup Controller
 * Quick and easy list creation - no complex configuration
 */

/**
 * Get default list presets
 * GET /api/v1/simple-board/presets
 */
export const getPresets = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const presets = {
    basic: {
      name: 'Basic',
      description: 'Simple 3-list setup',
      lists: ['To Do', 'In Progress', 'Done'],
    },
    priority: {
      name: 'Priority',
      description: 'Organize by priority level',
      lists: ['Urgent', 'High Priority', 'Medium Priority', 'Low Priority', 'Done'],
    },
    kanban: {
      name: 'Kanban',
      description: 'Full Kanban workflow',
      lists: ['Backlog', 'To Do', 'In Progress', 'Review', 'Done'],
    },
    agile: {
      name: 'Agile',
      description: 'Agile sprint workflow',
      lists: ['Backlog', 'Sprint Planning', 'In Progress', 'Testing', 'Done'],
    },
    simple: {
      name: 'Simple',
      description: 'Minimal setup',
      lists: ['Not Started', 'Working On It', 'Completed'],
    },
  };

  successResponse(res, {
    presets,
    message: 'Choose a preset or create your own custom lists',
  });
});

/**
 * Quick setup: Create lists from user input
 * POST /api/v1/simple-board/create-lists
 *
 * Body:
 * {
 *   userId: string,
 *   boardId: string,
 *   listNames: ["Urgent", "To Do", "In Progress", "Done", "Backlog"]
 * }
 */
export const createLists = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  // Get userId from authenticated request (set by auth middleware)
  const userId = req.userId!;
  const { boardId, listNames } = req.body;

  // Validation
  if (!boardId) {
    throw new ValidationError('boardId is required');
  }

  if (!listNames || !Array.isArray(listNames)) {
    throw new ValidationError('listNames must be an array');
  }

  if (listNames.length === 0) {
    throw new ValidationError('Please provide at least one list name');
  }

  if (listNames.length > 10) {
    throw new ValidationError('Maximum 10 lists allowed at once');
  }

  logger.info(`Creating ${listNames.length} lists on board ${boardId} for user ${userId}`);

  // Get existing lists to avoid duplicates
  const existingLists = await trelloService.getLists(userId, boardId);
  const existingNames = new Set(
    existingLists.map(l => l.name.toLowerCase())
  );

  const results = {
    created: [] as string[],
    alreadyExists: [] as string[],
    failed: [] as { name: string; error: string }[],
  };

  // Create each list
  for (let i = 0; i < listNames.length; i++) {
    const listName = listNames[i].trim();

    // Skip empty names
    if (!listName) {
      continue;
    }

    // Check if already exists (case-insensitive)
    if (existingNames.has(listName.toLowerCase())) {
      results.alreadyExists.push(listName);
      logger.info(`List "${listName}" already exists on board ${boardId}, skipping`);
      continue;
    }

    // Create the list - individual failures don't stop batch operation
    try {
      await trelloService.createList(userId, boardId, listName, i);
      results.created.push(listName);
      logger.info(`Created list "${listName}" at position ${i} on board ${boardId}`);
    } catch (error: any) {
      results.failed.push({
        name: listName,
        error: error.message || 'Unknown error',
      });
      logger.error(`Failed to create list "${listName}":`, error);
    }
  }

  // Build response message
  let message = '';
  if (results.created.length > 0) {
    message = `Created ${results.created.length} new list${results.created.length > 1 ? 's' : ''}.`;
  }
  if (results.alreadyExists.length > 0) {
    message += ` ${results.alreadyExists.length} already existed.`;
  }
  if (results.failed.length > 0) {
    message += ` ${results.failed.length} failed.`;
  }

  logger.info(`Board setup complete: ${message}`);

  successResponse(res, {
    created: results.created,
    alreadyExists: results.alreadyExists,
    failed: results.failed,
    total: listNames.length,
    message: message.trim(),
  });
});

/**
 * Get current lists on a board
 * GET /api/v1/simple-board/:boardId/lists?userId=xxx
 */
export const getLists = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { boardId } = req.params;
  // Get userId from authenticated request
  const userId = req.userId!;

  const lists = await trelloService.getLists(userId, boardId);

  successResponse(res, {
    lists: lists.map(l => ({
      id: l.id,
      name: l.name,
      position: l.pos,
    })),
    count: lists.length,
  });
});
