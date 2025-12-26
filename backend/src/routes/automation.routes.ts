import { Router } from 'express';
import { authenticateToken, extractUserId } from '../middleware/auth.middleware';
import { apiLimiter } from '../middleware/rateLimiter';
import * as automationController from '../controllers/automation.controller';

const router = Router();

/**
 * Automation Routes
 * Base path: /api/v1/automation
 *
 * IMPORTANT: All routes require authentication
 * One-click automation endpoints for processing emails
 */

// All automation routes require authentication
router.use(authenticateToken);
router.use(extractUserId);

// Process all unread emails in inbox
router.post('/process-inbox', apiLimiter, automationController.processInbox);

// Process emails with custom filters
router.post('/process-filtered', apiLimiter, automationController.processFiltered);

// Enable continuous auto-processing (Gmail push notifications)
router.post('/enable', apiLimiter, automationController.enableAutomation);

// Disable continuous auto-processing
router.post('/disable', apiLimiter, automationController.disableAutomation);

// Get automation status for the authenticated user
router.get('/status', apiLimiter, automationController.getAutomationStatus);

export default router;
