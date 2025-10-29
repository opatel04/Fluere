import { Router } from 'express';
import * as boardAutomationController from '../controllers/board-automation.controller';

const router = Router();

/**
 * Board Automation Routes
 * /api/v1/board-automation
 */

// Get configuration templates
router.get('/templates', boardAutomationController.getTemplates);

// Get all board configurations for a user
router.get('/user/:userId', boardAutomationController.getUserBoardConfigs);

// Get board configuration
router.get('/:boardId', boardAutomationController.getBoardConfig);

// Create or update board configuration
router.post('/:boardId', boardAutomationController.saveBoardConfig);

// Initialize board with configured lists
router.post('/:boardId/initialize', boardAutomationController.initializeBoard);

// Test routing for a task
router.post('/:boardId/test-routing', boardAutomationController.testRouting);

// Delete board configuration
router.delete('/:boardId', boardAutomationController.deleteBoardConfig);

// Create a list on a board
router.post('/:boardId/lists', boardAutomationController.createList);

// Move a card to a different list
router.post('/cards/:cardId/move', boardAutomationController.moveCard);

export default router;
