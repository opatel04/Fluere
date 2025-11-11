import { Router } from 'express';
import { apiLimiter } from '../middleware/rateLimiter';
import * as gmailController from '../controllers/gmail.controller';
import * as inboundEmailController from '../controllers/inbound-email.controller';
import { verifyGmailWebhook, verifyResendWebhook, webhookRateLimiter, webhookLogger } from '../middleware/webhookVerification';
import { authenticateToken } from '../middleware/auth.middleware';

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

// Gmail webhook - with verification middleware
router.post('/webhook',
  webhookLogger('gmail'),
  webhookRateLimiter(100, 60000),
  verifyGmailWebhook,
  gmailController.handleWebhook
);

// Email operations (DISABLED - requires gmail.modify scope)
// This route will return 403 until gmail.modify scope is added
router.post('/:messageId/read', gmailController.markAsRead);

// Push notification subscriptions
router.post('/subscribe', apiLimiter, gmailController.subscribeToNotifications);
router.post('/unsubscribe', apiLimiter, gmailController.unsubscribeFromNotifications);

// ===== INBOUND EMAIL ROUTES (Freelancer Pivot) =====
// Webhook for receiving forwarded emails from Resend/SendGrid
router.post('/inbound',
  webhookLogger('inbound'),
  webhookRateLimiter(200, 60000), // Allow 200 emails per minute
  verifyResendWebhook, // Verify Svix signature from Resend
  inboundEmailController.receiveInboundEmail
);

// Manual processing endpoint for testing (requires auth)
router.post('/inbound/process',
  authenticateToken,
  apiLimiter,
  inboundEmailController.processInboundEmailManual
);

// Get inbound email by ID (requires auth)
router.get('/inbound/:id',
  authenticateToken,
  inboundEmailController.getInboundEmail
);

// List all inbound emails (requires auth)
router.get('/inbound',
  authenticateToken,
  inboundEmailController.listInboundEmails
);

// Retry failed inbound email processing (requires auth)
router.post('/inbound/:id/retry',
  authenticateToken,
  apiLimiter,
  inboundEmailController.retryInboundEmail
);

export default router;
