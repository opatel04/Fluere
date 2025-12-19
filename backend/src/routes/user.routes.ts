import { Router } from 'express';
import { apiLimiter } from '../middleware/rateLimiter';
import { authenticateToken, extractUserId } from '../middleware/auth.middleware';
import * as userController from '../controllers/user.controller';

const router = Router();

// All user routes require authentication and userId extraction
router.use(authenticateToken);
router.use(extractUserId);

// Get user profile
router.get('/profile', apiLimiter, userController.getProfile);

// Update user profile
router.put('/profile', apiLimiter, userController.updateProfile);

// Get account statistics
router.get('/stats', apiLimiter, userController.getAccountStats);

// Get user preferences
router.get('/preferences', apiLimiter, userController.getPreferences);

// Update user preferences
router.put('/preferences', apiLimiter, userController.updatePreferences);

// Send test daily summary email
router.post('/test-daily-summary', apiLimiter, userController.sendTestDailySummary);

// Export user data (GDPR compliance)
router.get('/export', apiLimiter, userController.exportUserData);

// Delete user account (GDPR compliance)
// Note: This is a destructive operation and requires confirmation
router.delete('/account', apiLimiter, userController.deleteAccount);

export default router;
