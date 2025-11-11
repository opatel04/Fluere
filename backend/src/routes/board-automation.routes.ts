import { Router } from 'express';
import { authenticateToken, extractUserId } from '../middleware/auth.middleware';
import { apiLimiter } from '../middleware/rateLimiter';
import * as boardAutomationController from '../controllers/board-automation.controller';

const router = Router();

/**
 * Board Automation Routes
 * /api/v1/board-automation
 * IMPORTANT: All routes require authentication
 */

// All routes require authentication
router.use(authenticateToken);
router.use(extractUserId);

// Get configuration templates
router.get('/templates', apiLimiter, boardAutomationController.getTemplates);

// Get all board configurations for authenticated user
router.get('/configs', apiLimiter, boardAutomationController.getUserBoardConfigs);

// Get board configuration
router.get('/:boardId', apiLimiter, boardAutomationController.getBoardConfig);

// Create or update board configuration
router.post('/:boardId', apiLimiter, boardAutomationController.saveBoardConfig);

// Initialize board with configured lists
router.post('/:boardId/initialize', apiLimiter, boardAutomationController.initializeBoard);

// Test routing for a task
router.post('/:boardId/test-routing', apiLimiter, boardAutomationController.testRouting);

// Delete board configuration
router.delete('/:boardId', apiLimiter, boardAutomationController.deleteBoardConfig);

// Create a list on a board
router.post('/:boardId/lists', apiLimiter, boardAutomationController.createList);

// Move a card to a different list
router.post('/cards/:cardId/move', apiLimiter, boardAutomationController.moveCard);

export default router;
