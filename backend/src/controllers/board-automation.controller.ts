import { Request, Response } from 'express';
import boardAutomationService, {
  ListConfig,
  RoutingRule,
} from '../services/board-automation.service';
import trelloService from '../services/trello.service';
import { asyncHandler } from '../middleware/errorHandler';
import { successResponse, successWithCount, createdResponse, listResponse } from '../utils/responses';
import { ValidationError, NotFoundError, ForbiddenError } from '../types/errors';

/**
 * Board Automation Controller
 * Manages user-configured board layouts and card routing
 */

/**
 * Get board configuration
 * GET /api/v1/board-automation/:boardId
 */
export const getBoardConfig = asyncHandler(async (
  req: Request,
  res: Response
): Promise<void> => {
  // userId is guaranteed by extractUserId middleware
  const userId = (req as any).userId;
  const { boardId } = req.params;

  const config = await boardAutomationService.getBoardConfig(userId, boardId);

  if (!config) {
    throw new NotFoundError('Board configuration');
  }

  successResponse(res, config);
});

/**
 * Get all board configurations for authenticated user
 * GET /api/v1/board-automation/configs
 */
export const getUserBoardConfigs = asyncHandler(async (
  req: Request,
  res: Response
): Promise<void> => {
  // userId is guaranteed by extractUserId middleware
  const userId = (req as any).userId;

  const configs = await boardAutomationService.getUserBoardConfigs(userId);

  successWithCount(res, configs);
});

/**
 * Create or update board configuration
 * POST /api/v1/board-automation/:boardId
 *
 * Body:
 * {
 *   userId: string,
 *   lists: [
 *     { name: "To Do", position: 0, autoCreate: true },
 *     { name: "In Progress", position: 1, autoCreate: true },
 *     { name: "Done", position: 2, autoCreate: true }
 *   ],
 *   routingRules: [
 *     {
 *       name: "Urgent tasks to Urgent",
 *       condition: { type: "priority", operator: "equals", value: "urgent" },
 *       targetList: "Urgent",
 *       priority: 100,
 *       enabled: true
 *     }
 *   ]
 * }
 */
export const saveBoardConfig = asyncHandler(async (
  req: Request,
  res: Response
): Promise<void> => {
  const { boardId } = req.params;
  const { userId, lists, routingRules } = req.body;

  if (!userId || !lists || !routingRules) {
    throw new ValidationError('userId, lists, and routingRules are required');
  }

  // Validate lists
  if (!Array.isArray(lists) || lists.length === 0) {
    throw new ValidationError('lists must be a non-empty array');
  }

  // Validate routing rules
  if (!Array.isArray(routingRules)) {
    throw new ValidationError('routingRules must be an array');
  }

  // Verify user has access to the board
  try {
    await trelloService.getBoard(userId, boardId);
  } catch (error) {
    throw new ForbiddenError('You do not have access to this board');
  }

  const config = await boardAutomationService.saveBoardConfig(
    userId,
    boardId,
    lists as ListConfig[],
    routingRules as RoutingRule[]
  );

  successResponse(res, config, 'Board configuration saved successfully');
});

/**
 * Initialize board with configured lists
 * POST /api/v1/board-automation/:boardId/initialize
 *
 * Creates all configured lists that don't exist yet
 */
export const initializeBoard = asyncHandler(async (
  req: Request,
  res: Response
): Promise<void> => {
  const { boardId } = req.params;
  // userId is guaranteed by extractUserId middleware
  const userId = (req as any).userId;

  const result = await boardAutomationService.initializeBoard(userId, boardId);

  successResponse(res, result, `Created ${result.listsCreated.length} new lists, ${result.listsExisting.length} lists already existed`);
});

/**
 * Delete board configuration
 * DELETE /api/v1/board-automation/:boardId
 */
export const deleteBoardConfig = asyncHandler(async (
  req: Request,
  res: Response
): Promise<void> => {
  const { boardId } = req.params;
  // userId is guaranteed by extractUserId middleware
  const userId = (req as any).userId;

  await boardAutomationService.deleteBoardConfig(userId, boardId);

  successResponse(res, {}, 'Board configuration deleted successfully');
});

/**
 * Test routing for a task
 * POST /api/v1/board-automation/:boardId/test-routing
 *
 * Body:
 * {
 *   userId: string,
 *   task: {
 *     name: string,
 *     priority: string,
 *     category: string,
 *     dueDate?: string,
 *     labels?: string[]
 *   }
 * }
 *
 * Returns which list the task would be routed to
 */
export const testRouting = asyncHandler(async (
  req: Request,
  res: Response
): Promise<void> => {
  const { boardId } = req.params;
  const { userId, task } = req.body;

  if (!userId || !task) {
    throw new ValidationError('userId and task are required');
  }

  const routing = await boardAutomationService.routeTask(userId, boardId, task);

  successResponse(res, routing);
});

/**
 * Create a list on a board
 * POST /api/v1/board-automation/:boardId/lists
 *
 * Body:
 * {
 *   userId: string,
 *   name: string,
 *   position?: 'top' | 'bottom' | number
 * }
 */
export const createList = asyncHandler(async (
  req: Request,
  res: Response
): Promise<void> => {
  const { boardId } = req.params;
  const { userId, name, position } = req.body;

  if (!userId || !name) {
    throw new ValidationError('userId and name are required');
  }

  const list = await trelloService.createList(userId, boardId, name, position);

  successResponse(res, list, `List "${name}" created successfully`);
});

/**
 * Move a card to a different list
 * POST /api/v1/board-automation/cards/:cardId/move
 *
 * Body:
 * {
 *   userId: string,
 *   targetListId: string,
 *   position?: 'top' | 'bottom' | number
 * }
 */
export const moveCard = asyncHandler(async (
  req: Request,
  res: Response
): Promise<void> => {
  const { cardId } = req.params;
  const { userId, targetListId, position } = req.body;

  if (!userId || !targetListId) {
    throw new ValidationError('userId and targetListId are required');
  }

  const card = await trelloService.moveCard(userId, cardId, targetListId, position);

  successResponse(res, card, 'Card moved successfully');
});

/**
 * Get template configurations for quick setup
 * GET /api/v1/board-automation/templates
 */
export const getTemplates = asyncHandler(async (
  req: Request,
  res: Response
): Promise<void> => {
  const templates = [
      {
        name: 'Priority-Based',
        description: 'Organize tasks by priority level',
        lists: [
          { name: 'Urgent', position: 0, autoCreate: true },
          { name: 'High Priority', position: 1, autoCreate: true },
          { name: 'Medium Priority', position: 2, autoCreate: true },
          { name: 'Low Priority', position: 3, autoCreate: true },
          { name: 'Done', position: 4, autoCreate: true },
        ],
        routingRules: [
          {
            name: 'Urgent priority tasks',
            condition: { type: 'priority', operator: 'equals', value: 'urgent' },
            targetList: 'Urgent',
            priority: 100,
            enabled: true,
          },
          {
            name: 'High priority tasks',
            condition: { type: 'priority', operator: 'equals', value: 'high' },
            targetList: 'High Priority',
            priority: 80,
            enabled: true,
          },
          {
            name: 'Medium priority tasks',
            condition: { type: 'priority', operator: 'equals', value: 'medium' },
            targetList: 'Medium Priority',
            priority: 60,
            enabled: true,
          },
          {
            name: 'Low priority tasks',
            condition: { type: 'priority', operator: 'equals', value: 'low' },
            targetList: 'Low Priority',
            priority: 40,
            enabled: true,
          },
        ],
      },
      {
        name: 'Category-Based',
        description: 'Organize tasks by category',
        lists: [
          { name: 'Meetings', position: 0, autoCreate: true },
          { name: 'Documentation', position: 1, autoCreate: true },
          { name: 'Development', position: 2, autoCreate: true },
          { name: 'Review', position: 3, autoCreate: true },
          { name: 'Other', position: 4, autoCreate: true },
        ],
        routingRules: [
          {
            name: 'Meeting tasks',
            condition: { type: 'category', operator: 'equals', value: 'meeting' },
            targetList: 'Meetings',
            priority: 100,
            enabled: true,
          },
          {
            name: 'Documentation tasks',
            condition: { type: 'category', operator: 'equals', value: 'documentation' },
            targetList: 'Documentation',
            priority: 90,
            enabled: true,
          },
          {
            name: 'Development tasks',
            condition: { type: 'category', operator: 'contains', value: 'development' },
            targetList: 'Development',
            priority: 80,
            enabled: true,
          },
        ],
      },
      {
        name: 'Time-Based',
        description: 'Organize tasks by due date',
        lists: [
          { name: 'Overdue', position: 0, autoCreate: true },
          { name: 'Due Today', position: 1, autoCreate: true },
          { name: 'Due This Week', position: 2, autoCreate: true },
          { name: 'Due Later', position: 3, autoCreate: true },
          { name: 'No Due Date', position: 4, autoCreate: true },
        ],
        routingRules: [
          {
            name: 'Overdue tasks',
            condition: { type: 'dueDate', operator: 'lessThan', value: 0 },
            targetList: 'Overdue',
            priority: 100,
            enabled: true,
          },
          {
            name: 'Due today',
            condition: { type: 'dueDate', operator: 'lessThan', value: 1 },
            targetList: 'Due Today',
            priority: 90,
            enabled: true,
          },
          {
            name: 'Due this week',
            condition: { type: 'dueDate', operator: 'lessThan', value: 7 },
            targetList: 'Due This Week',
            priority: 80,
            enabled: true,
          },
        ],
      },
    ];

  successResponse(res, {
    templates,
    count: templates.length,
  });
});
