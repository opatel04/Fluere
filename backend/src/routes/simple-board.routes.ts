import { Router } from 'express';
import * as simpleBoardController from '../controllers/simple-board.controller';
import { flexibleAuth } from '../middleware/auth.middleware';

const router = Router();

/**
 * Simple Board Setup Routes
 * /api/v1/simple-board
 *
 * Uses flexibleAuth middleware:
 * - Production: Extracts userId from JWT token
 * - Development: Accepts userId from body/query for testing
 */

// Get preset list configurations (no auth needed)
router.get('/presets', simpleBoardController.getPresets);

// Create lists on a board (requires auth)
router.post('/create-lists', flexibleAuth, simpleBoardController.createLists);

// Get current lists on a board (requires auth)
router.get('/:boardId/lists', flexibleAuth, simpleBoardController.getLists);

export default router;
