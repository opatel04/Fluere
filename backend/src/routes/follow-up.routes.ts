import { Router } from 'express';
import { apiLimiter } from '../middleware/rateLimiter';
import { authenticateToken, extractUserId } from '../middleware/auth.middleware';
import * as followUpController from '../controllers/follow-up.controller';

const router = Router();

// All follow-up routes require authentication and userId extraction
router.use(authenticateToken);
router.use(extractUserId);

// Get follow-up statistics (must be before /:id to avoid conflict)
router.get('/stats', apiLimiter, followUpController.getFollowUpStats);

// Get urgent follow-ups (must be before /:id)
router.get('/urgent', apiLimiter, followUpController.getUrgentFollowUps);

// Trigger manual follow-up detection
router.post('/detect', apiLimiter, followUpController.detectFollowUps);

// Get all follow-ups with optional status filter
router.get('/', apiLimiter, followUpController.getFollowUps);

// Get specific follow-up by ID
router.get('/:id', apiLimiter, followUpController.getFollowUpById);

// Dismiss a follow-up
router.post('/:id/dismiss', apiLimiter, followUpController.dismissFollowUp);

// Mark follow-up as responded
router.post('/:id/respond', apiLimiter, followUpController.markFollowUpResponded);

export default router;
