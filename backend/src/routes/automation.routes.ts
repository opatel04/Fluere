import { Router } from 'express';
import * as automationController from '../controllers/automation.controller';

const router = Router();

/**
 * Automation Routes
 * Base path: /api/v1/automation
 *
 * One-click automation endpoints for processing emails
 */

// Process all unread emails in inbox
router.post('/process-inbox', automationController.processInbox);

// Process emails with custom filters
router.post('/process-filtered', automationController.processFiltered);

// Enable continuous auto-processing (Gmail push notifications)
router.post('/enable', automationController.enableAutomation);

// Disable continuous auto-processing
router.post('/disable', automationController.disableAutomation);

// Get automation status for a user
router.get('/status/:userId', automationController.getAutomationStatus);

export default router;
