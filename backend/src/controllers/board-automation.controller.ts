import { Request, Response, NextFunction } from 'express';
import boardAutomationService, {
  ListConfig,
  RoutingRule,
} from '../services/board-automation.service';
import trelloService from '../services/trello.service';
import logger from '../config/logger';

/**
 * Board Automation Controller
 * Manages user-configured board layouts and card routing
 */

/**
 * Get board configuration
 * GET /api/v1/board-automation/:boardId
 */
export const getBoardConfig = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { boardId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'userId is required',
      });
      return;
    }

    const config = await boardAutomationService.getBoardConfig(userId, boardId);

    if (!config) {
      res.status(404).json({
        success: false,
        error: 'Board configuration not found',
      });
      return;
    }

    res.json({
      success: true,
      data: config,
    });
  } catch (error: any) {
    logger.error('Error in getBoardConfig controller:', error);
    next(error);
  }
};

/**
 * Get all board configurations for a user
 * GET /api/v1/board-automation/user/:userId
 */
export const getUserBoardConfigs = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { userId } = req.params;

    const configs = await boardAutomationService.getUserBoardConfigs(userId);

    res.json({
      success: true,
      data: {
        configs,
        count: configs.length,
      },
    });
  } catch (error: any) {
    logger.error('Error in getUserBoardConfigs controller:', error);
    next(error);
  }
};

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
export const saveBoardConfig = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { boardId } = req.params;
    const { userId, lists, routingRules } = req.body;

    if (!userId || !lists || !routingRules) {
      res.status(400).json({
        success: false,
        error: 'userId, lists, and routingRules are required',
      });
      return;
    }

    // Validate lists
    if (!Array.isArray(lists) || lists.length === 0) {
      res.status(400).json({
        success: false,
        error: 'lists must be a non-empty array',
      });
      return;
    }

    // Validate routing rules
    if (!Array.isArray(routingRules)) {
      res.status(400).json({
        success: false,
        error: 'routingRules must be an array',
      });
      return;
    }

    // Verify user has access to the board
    try {
      await trelloService.getBoard(userId, boardId);
    } catch (error) {
      res.status(403).json({
        success: false,
        error: 'You do not have access to this board',
      });
      return;
    }

    const config = await boardAutomationService.saveBoardConfig(
      userId,
      boardId,
      lists as ListConfig[],
      routingRules as RoutingRule[]
    );

    logger.info(`Saved board config for user ${userId}, board ${boardId}`);

    res.json({
      success: true,
      data: config,
      message: 'Board configuration saved successfully',
    });
  } catch (error: any) {
    logger.error('Error in saveBoardConfig controller:', error);
    next(error);
  }
};

/**
 * Initialize board with configured lists
 * POST /api/v1/board-automation/:boardId/initialize
 *
 * Creates all configured lists that don't exist yet
 */
export const initializeBoard = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { boardId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'userId is required',
      });
      return;
    }

    const result = await boardAutomationService.initializeBoard(userId, boardId);

    logger.info(`Initialized board ${boardId} for user ${userId}`, result);

    res.json({
      success: true,
      data: result,
      message: `Created ${result.listsCreated.length} new lists, ${result.listsExisting.length} lists already existed`,
    });
  } catch (error: any) {
    logger.error('Error in initializeBoard controller:', error);
    next(error);
  }
};

/**
 * Delete board configuration
 * DELETE /api/v1/board-automation/:boardId
 */
export const deleteBoardConfig = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { boardId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'userId is required',
      });
      return;
    }

    await boardAutomationService.deleteBoardConfig(userId, boardId);

    logger.info(`Deleted board config for user ${userId}, board ${boardId}`);

    res.json({
      success: true,
      message: 'Board configuration deleted successfully',
    });
  } catch (error: any) {
    logger.error('Error in deleteBoardConfig controller:', error);
    next(error);
  }
};

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
export const testRouting = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { boardId } = req.params;
    const { userId, task } = req.body;

    if (!userId || !task) {
      res.status(400).json({
        success: false,
        error: 'userId and task are required',
      });
      return;
    }

    const routing = await boardAutomationService.routeTask(userId, boardId, task);

    res.json({
      success: true,
      data: routing,
    });
  } catch (error: any) {
    logger.error('Error in testRouting controller:', error);
    next(error);
  }
};

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
export const createList = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { boardId } = req.params;
    const { userId, name, position } = req.body;

    if (!userId || !name) {
      res.status(400).json({
        success: false,
        error: 'userId and name are required',
      });
      return;
    }

    const list = await trelloService.createList(userId, boardId, name, position);

    logger.info(`Created list "${name}" on board ${boardId} for user ${userId}`);

    res.json({
      success: true,
      data: list,
      message: `List "${name}" created successfully`,
    });
  } catch (error: any) {
    logger.error('Error in createList controller:', error);
    next(error);
  }
};

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
export const moveCard = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { cardId } = req.params;
    const { userId, targetListId, position } = req.body;

    if (!userId || !targetListId) {
      res.status(400).json({
        success: false,
        error: 'userId and targetListId are required',
      });
      return;
    }

    const card = await trelloService.moveCard(userId, cardId, targetListId, position);

    logger.info(`Moved card ${cardId} to list ${targetListId} for user ${userId}`);

    res.json({
      success: true,
      data: card,
      message: 'Card moved successfully',
    });
  } catch (error: any) {
    logger.error('Error in moveCard controller:', error);
    next(error);
  }
};

/**
 * Get template configurations for quick setup
 * GET /api/v1/board-automation/templates
 */
export const getTemplates = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
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

    res.json({
      success: true,
      data: {
        templates,
        count: templates.length,
      },
    });
  } catch (error: any) {
    logger.error('Error in getTemplates controller:', error);
    next(error);
  }
};
