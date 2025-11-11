import { Router } from 'express';
import { apiLimiter } from '../middleware/rateLimiter';
import { authenticateToken } from '../middleware/auth.middleware';
import * as activityController from '../controllers/activity-log.controller';

const router = Router();

// All activity routes require authentication
router.use(authenticateToken);

// Get user's activity logs
router.get('/', apiLimiter, activityController.getUserActivities);

// Get user's activity statistics
router.get('/stats', apiLimiter, activityController.getUserActivityStats);

// Get recent failures for debugging
router.get('/failures', apiLimiter, activityController.getRecentFailures);

// Get activity timeline (grouped by date)
router.get('/timeline', apiLimiter, activityController.getActivityTimeline);

export default router;
