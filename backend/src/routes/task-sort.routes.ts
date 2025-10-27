import { Router } from 'express';
import taskSortController from '../controllers/task-sort.controller';

const router = Router();

/**
 * Task Sorting Routes
 */

// Get available sort and filter options
router.get('/options', taskSortController.getOptions.bind(taskSortController));

// Sort tasks using dropdown options
router.post('/sort', taskSortController.sortTasks.bind(taskSortController));

// Sort tasks using chat prompt
router.post('/sort/chat', taskSortController.sortByChat.bind(taskSortController));

export default router;
