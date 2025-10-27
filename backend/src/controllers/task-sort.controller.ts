import { Request, Response } from 'express';
import taskSortService, { SortOption, FilterOption } from '../services/task-sort.service';
import logger from '../config/logger';
import { ExtractedTask } from '../types/ai.types';

/**
 * Task Sorting Controller
 * Handles API requests for task sorting and filtering
 */
class TaskSortController {
  /**
   * GET /api/tasks/sort/options
   * Get available sort and filter options
   */
  async getOptions(req: Request, res: Response): Promise<void> {
    try {
      const options = taskSortService.getAvailableOptions();

      res.status(200).json({
        success: true,
        data: options,
      });
    } catch (error) {
      logger.error('Error getting sort options:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get sort options',
      });
    }
  }

  /**
   * POST /api/tasks/sort
   * Sort and filter tasks using dropdown options
   *
   * Body:
   * {
   *   "tasks": ExtractedTask[],
   *   "sortBy": "priority" | "name" | "date" | "month" | "year",
   *   "filters": ["urgent", "overdue", etc.]
   * }
   */
  async sortTasks(req: Request, res: Response): Promise<void> {
    try {
      const { tasks, sortBy, filters, userTimezone, userCurrentDate } = req.body;

      // Validate input
      if (!tasks || !Array.isArray(tasks)) {
        res.status(400).json({
          success: false,
          error: 'Tasks array is required',
        });
        return;
      }

      // Sort and filter tasks
      const sortedTasks = taskSortService.sortAndFilter(tasks, {
        sortBy: sortBy as SortOption,
        filters: filters as FilterOption[],
        userTimezone,
        userCurrentDate,
      });

      res.status(200).json({
        success: true,
        data: {
          tasks: sortedTasks,
          count: sortedTasks.length,
          originalCount: tasks.length,
          sortBy,
          filters,
        },
      });
    } catch (error) {
      logger.error('Error sorting tasks:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to sort tasks',
      });
    }
  }

  /**
   * POST /api/tasks/sort/chat
   * Sort tasks using natural language chat prompt
   *
   * Body:
   * {
   *   "tasks": ExtractedTask[],
   *   "prompt": "Show me urgent tasks first"
   * }
   */
  async sortByChat(req: Request, res: Response): Promise<void> {
    try {
      const { tasks, prompt, userTimezone, userCurrentDate } = req.body;

      // Validate input
      if (!tasks || !Array.isArray(tasks)) {
        res.status(400).json({
          success: false,
          error: 'Tasks array is required',
        });
        return;
      }

      if (!prompt || typeof prompt !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Prompt is required',
        });
        return;
      }

      // Process chat sort request
      const result = await taskSortService.sortByChat({
        tasks,
        prompt,
        userTimezone,
        userCurrentDate,
      });

      res.status(200).json({
        success: true,
        data: {
          tasks: result.sortedTasks,
          count: result.sortedTasks.length,
          originalCount: tasks.length,
          explanation: result.explanation,
          sortCriteria: result.sortCriteria,
        },
      });
    } catch (error) {
      logger.error('Error processing chat sort:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process chat sort request',
      });
    }
  }
}

export default new TaskSortController();
