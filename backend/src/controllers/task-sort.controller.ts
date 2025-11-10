import { Request, Response } from 'express';
import taskSortService, { SortOption, FilterOption } from '../services/task-sort.service';
import logger from '../config/logger';
import { ExtractedTask } from '../types/ai.types';
import { asyncHandler } from '../middleware/errorHandler';
import { ValidationError } from '../types/errors';

/**
 * Task Sorting Controller
 * Handles API requests for task sorting and filtering
 */
class TaskSortController {
  /**
   * GET /api/tasks/sort/options
   * Get available sort and filter options
   */
  getOptions = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const options = taskSortService.getAvailableOptions();

    res.status(200).json({
      success: true,
      data: options,
    });
  });

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
  sortTasks = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { tasks, sortBy, filters, userTimezone, userCurrentDate } = req.body;

    // Validate input
    if (!tasks || !Array.isArray(tasks)) {
      throw new ValidationError('Tasks array is required');
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
  });

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
  sortByChat = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { tasks, prompt, userTimezone, userCurrentDate } = req.body;

    // Validate input
    if (!tasks || !Array.isArray(tasks)) {
      throw new ValidationError('Tasks array is required');
    }

    if (!prompt || typeof prompt !== 'string') {
      throw new ValidationError('Prompt is required');
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
  });
}

export default new TaskSortController();
