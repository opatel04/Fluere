import logger from '../config/logger';
import db from '../config/database';
import trelloService from './trello.service';
import { ExtractedTask } from '../types/ai.types';

/**
 * Board Automation Service
 * Manages user-configured board layouts and card routing rules
 */

export interface BoardConfig {
  id: string;
  userId: string;
  boardId: string;
  lists: ListConfig[];
  routingRules: RoutingRule[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ListConfig {
  name: string;
  position: number;
  autoCreate: boolean;
}

export interface RoutingRule {
  id?: string;
  name: string;
  condition: RoutingCondition;
  targetList: string;
  priority: number;
  enabled: boolean;
}

export interface RoutingCondition {
  type: 'priority' | 'category' | 'keyword' | 'dueDate' | 'label' | 'custom';
  operator: 'equals' | 'contains' | 'greaterThan' | 'lessThan' | 'in';
  value: string | string[] | number;
}

class BoardAutomationService {
  /**
   * Get board configuration for a user
   */
  async getBoardConfig(userId: string, boardId: string): Promise<BoardConfig | null> {
    try {
      const result = await db.query(
        `SELECT * FROM board_configs WHERE user_id = $1 AND board_id = $2`,
        [userId, boardId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const config = result.rows[0];

      // Get lists configuration
      const listsResult = await db.query(
        `SELECT * FROM board_lists_config
         WHERE board_config_id = $1
         ORDER BY position ASC`,
        [config.id]
      );

      // Get routing rules
      const rulesResult = await db.query(
        `SELECT * FROM board_routing_rules
         WHERE board_config_id = $1
         ORDER BY priority DESC`,
        [config.id]
      );

      return {
        id: config.id,
        userId: config.user_id,
        boardId: config.board_id,
        lists: listsResult.rows.map(row => ({
          name: row.list_name,
          position: row.position,
          autoCreate: row.auto_create,
        })),
        routingRules: rulesResult.rows.map(row => ({
          id: row.id,
          name: row.rule_name,
          condition: row.condition,
          targetList: row.target_list,
          priority: row.priority,
          enabled: row.enabled,
        })),
        createdAt: config.created_at,
        updatedAt: config.updated_at,
      };
    } catch (error) {
      logger.error('Error getting board config:', error);
      throw new Error('Failed to get board configuration');
    }
  }

  /**
   * Create or update board configuration
   */
  async saveBoardConfig(
    userId: string,
    boardId: string,
    lists: ListConfig[],
    routingRules: RoutingRule[]
  ): Promise<BoardConfig> {
    try {
      // Start transaction
      await db.query('BEGIN');

      // Insert or update board config
      const configResult = await db.query(
        `INSERT INTO board_configs (user_id, board_id, created_at, updated_at)
         VALUES ($1, $2, NOW(), NOW())
         ON CONFLICT (user_id, board_id)
         DO UPDATE SET updated_at = NOW()
         RETURNING *`,
        [userId, boardId]
      );

      const configId = configResult.rows[0].id;

      // Delete existing lists and rules
      await db.query('DELETE FROM board_lists_config WHERE board_config_id = $1', [configId]);
      await db.query('DELETE FROM board_routing_rules WHERE board_config_id = $1', [configId]);

      // Insert lists configuration
      for (const list of lists) {
        await db.query(
          `INSERT INTO board_lists_config
           (board_config_id, list_name, position, auto_create)
           VALUES ($1, $2, $3, $4)`,
          [configId, list.name, list.position, list.autoCreate]
        );
      }

      // Insert routing rules
      for (const rule of routingRules) {
        await db.query(
          `INSERT INTO board_routing_rules
           (board_config_id, rule_name, condition, target_list, priority, enabled)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [configId, rule.name, JSON.stringify(rule.condition), rule.targetList, rule.priority, rule.enabled]
        );
      }

      await db.query('COMMIT');

      logger.info(`Saved board config for user ${userId}, board ${boardId}`);

      return await this.getBoardConfig(userId, boardId) as BoardConfig;
    } catch (error) {
      await db.query('ROLLBACK');
      logger.error('Error saving board config:', error);
      throw new Error('Failed to save board configuration');
    }
  }

  /**
   * Initialize board with configured lists
   * Creates all lists that don't exist yet
   */
  async initializeBoard(userId: string, boardId: string): Promise<{
    listsCreated: string[];
    listsExisting: string[];
  }> {
    try {
      const config = await this.getBoardConfig(userId, boardId);

      if (!config) {
        logger.info(`No board config found for board ${boardId}, skipping initialization`);
        return { listsCreated: [], listsExisting: [] };
      }

      const listsCreated: string[] = [];
      const listsExisting: string[] = [];

      // Get existing lists
      const existingLists = await trelloService.getLists(userId, boardId);
      const existingListNames = new Set(
        existingLists.map(l => l.name.toLowerCase())
      );

      // Create missing lists
      for (const listConfig of config.lists) {
        if (!listConfig.autoCreate) {
          continue;
        }

        if (existingListNames.has(listConfig.name.toLowerCase())) {
          listsExisting.push(listConfig.name);
          logger.info(`List "${listConfig.name}" already exists on board ${boardId}`);
        } else {
          await trelloService.createList(userId, boardId, listConfig.name, listConfig.position);
          listsCreated.push(listConfig.name);
          logger.info(`Created list "${listConfig.name}" on board ${boardId}`);
        }
      }

      return { listsCreated, listsExisting };
    } catch (error) {
      logger.error('Error initializing board:', error);
      throw new Error('Failed to initialize board with configured lists');
    }
  }

  /**
   * Route a task to the appropriate list based on configured rules
   */
  async routeTask(
    userId: string,
    boardId: string,
    task: ExtractedTask
  ): Promise<{
    listName: string;
    listId?: string;
    matchedRule?: string;
  }> {
    try {
      const config = await this.getBoardConfig(userId, boardId);

      if (!config || config.routingRules.length === 0) {
        // Default behavior - route to "To Do" or first list
        return { listName: 'To Do' };
      }

      // Get existing lists on the board
      const lists = await trelloService.getLists(userId, boardId);
      const listMap = new Map(lists.map(l => [l.name.toLowerCase(), l]));

      // Sort rules by priority (highest first)
      const sortedRules = config.routingRules
        .filter(rule => rule.enabled)
        .sort((a, b) => b.priority - a.priority);

      // Evaluate rules in priority order
      for (const rule of sortedRules) {
        if (this.evaluateCondition(task, rule.condition)) {
          // Find the target list
          const targetList = listMap.get(rule.targetList.toLowerCase());

          logger.info(
            `Task "${task.name}" matched rule "${rule.name}", routing to list "${rule.targetList}"`
          );

          return {
            listName: rule.targetList,
            listId: targetList?.id,
            matchedRule: rule.name,
          };
        }
      }

      // No rules matched - use default list
      const defaultList = config.lists[0]?.name || 'To Do';
      const defaultListObj = listMap.get(defaultList.toLowerCase());

      logger.info(`Task "${task.name}" didn't match any rules, using default list "${defaultList}"`);

      return {
        listName: defaultList,
        listId: defaultListObj?.id,
      };
    } catch (error) {
      logger.error('Error routing task:', error);
      throw new Error('Failed to route task to list');
    }
  }

  /**
   * Evaluate a routing condition against a task
   */
  private evaluateCondition(task: ExtractedTask, condition: RoutingCondition): boolean {
    try {
      switch (condition.type) {
        case 'priority':
          return this.evaluatePriorityCondition(task, condition);

        case 'category':
          return this.evaluateCategoryCondition(task, condition);

        case 'keyword':
          return this.evaluateKeywordCondition(task, condition);

        case 'dueDate':
          return this.evaluateDueDateCondition(task, condition);

        case 'label':
          return this.evaluateLabelCondition(task, condition);

        default:
          logger.warn(`Unknown condition type: ${condition.type}`);
          return false;
      }
    } catch (error) {
      logger.error('Error evaluating condition:', error);
      return false;
    }
  }

  private evaluatePriorityCondition(task: ExtractedTask, condition: RoutingCondition): boolean {
    const { operator, value } = condition;

    switch (operator) {
      case 'equals':
        return task.priority === value;

      case 'in':
        return Array.isArray(value) && value.includes(task.priority);

      default:
        return false;
    }
  }

  private evaluateCategoryCondition(task: ExtractedTask, condition: RoutingCondition): boolean {
    const { operator, value } = condition;

    if (!task.category) return false;

    switch (operator) {
      case 'equals':
        return task.category.toLowerCase() === (value as string).toLowerCase();

      case 'contains':
        return task.category.toLowerCase().includes((value as string).toLowerCase());

      case 'in':
        return Array.isArray(value) &&
               value.some(v => v.toLowerCase() === task.category?.toLowerCase());

      default:
        return false;
    }
  }

  private evaluateKeywordCondition(task: ExtractedTask, condition: RoutingCondition): boolean {
    const { operator, value } = condition;
    const searchText = `${task.name} ${task.description || ''}`.toLowerCase();

    switch (operator) {
      case 'contains':
        if (typeof value === 'string') {
          return searchText.includes(value.toLowerCase());
        }
        if (Array.isArray(value)) {
          return value.some(keyword => searchText.includes(keyword.toLowerCase()));
        }
        return false;

      case 'equals':
        return searchText === (value as string).toLowerCase();

      default:
        return false;
    }
  }

  private evaluateDueDateCondition(task: ExtractedTask, condition: RoutingCondition): boolean {
    const { operator, value } = condition;

    if (!task.dueDate) return false;

    const dueDate = new Date(task.dueDate);
    const now = new Date();
    const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    switch (operator) {
      case 'lessThan':
        return daysUntilDue < (value as number);

      case 'greaterThan':
        return daysUntilDue > (value as number);

      case 'equals':
        return daysUntilDue === (value as number);

      default:
        return false;
    }
  }

  private evaluateLabelCondition(task: ExtractedTask, condition: RoutingCondition): boolean {
    const { operator, value } = condition;

    if (!task.labels || task.labels.length === 0) return false;

    const taskLabels = task.labels.map(l => l.toLowerCase());

    switch (operator) {
      case 'contains':
        if (typeof value === 'string') {
          return taskLabels.some(label => label.includes(value.toLowerCase()));
        }
        if (Array.isArray(value)) {
          return value.some(v => taskLabels.some(label => label.includes(v.toLowerCase())));
        }
        return false;

      case 'in':
        if (Array.isArray(value)) {
          return value.some(v => taskLabels.includes(v.toLowerCase()));
        }
        return false;

      default:
        return false;
    }
  }

  /**
   * Get all board configs for a user
   */
  async getUserBoardConfigs(userId: string): Promise<BoardConfig[]> {
    try {
      const result = await db.query(
        `SELECT board_id FROM board_configs WHERE user_id = $1`,
        [userId]
      );

      const configs: BoardConfig[] = [];

      for (const row of result.rows) {
        const config = await this.getBoardConfig(userId, row.board_id);
        if (config) {
          configs.push(config);
        }
      }

      return configs;
    } catch (error) {
      logger.error('Error getting user board configs:', error);
      throw new Error('Failed to get user board configurations');
    }
  }

  /**
   * Delete board configuration
   */
  async deleteBoardConfig(userId: string, boardId: string): Promise<void> {
    try {
      await db.query(
        `DELETE FROM board_configs WHERE user_id = $1 AND board_id = $2`,
        [userId, boardId]
      );

      logger.info(`Deleted board config for user ${userId}, board ${boardId}`);
    } catch (error) {
      logger.error('Error deleting board config:', error);
      throw new Error('Failed to delete board configuration');
    }
  }
}

export default new BoardAutomationService();
