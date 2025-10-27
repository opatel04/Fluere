import { Router } from 'express';
import { apiLimiter } from '../middleware/rateLimiter';
import * as gmailController from '../controllers/gmail.controller';

const router = Router();

// Email fetching routes
router.get('/fetch', apiLimiter, gmailController.fetchEmails);

// Email processing routes (to be implemented with background jobs)
router.post('/process', apiLimiter, (req, res) => {
  res.json({ message: 'Process emails endpoint - to be implemented' });
});

router.get('/status/:jobId', (req, res) => {
  res.json({ message: 'Email processing status endpoint - to be implemented' });
});

router.get('/status', (req, res) => {
  res.json({ message: 'Email processing status endpoint - to be implemented' });
});

// Gmail webhook
router.post('/webhook', gmailController.handleWebhook);

// Email operations (DISABLED - requires gmail.modify scope)
// This route will return 403 until gmail.modify scope is added
router.post('/:messageId/read', gmailController.markAsRead);

// Push notification subscriptions
router.post('/subscribe', apiLimiter, gmailController.subscribeToNotifications);
router.post('/unsubscribe', apiLimiter, gmailController.unsubscribeFromNotifications);

export default router;
