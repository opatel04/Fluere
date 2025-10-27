import { Router } from 'express';
import { apiLimiter } from '../middleware/rateLimiter';
import * as processController from '../controllers/email-processor.controller';

const router = Router();

/**
 * Email Processing Routes
 * Handle Gmail → AI → Trello automation
 */

// Process single email
router.post('/email/:messageId', apiLimiter, processController.processEmail);

// Process multiple emails in batch
router.post('/batch', apiLimiter, processController.processBatch);

// Test extraction (no Trello card creation)
router.post('/test', apiLimiter, processController.testExtraction);

// Test full workflow (extraction + Trello card creation)
router.post('/test/full', apiLimiter, processController.testFullWorkflow);

// Quick extraction test (no validation layer)
router.post('/test/quick', apiLimiter, processController.testQuickExtraction);

export default router;
