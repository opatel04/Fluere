import { Router } from 'express';
import { authLimiter } from '../middleware/rateLimiter';
import * as gmailController from '../controllers/gmail.controller';
import * as trelloController from '../controllers/trello.controller';
import { generateToken } from '../middleware/auth.middleware';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Gmail authentication routes
router.get('/gmail/connect', authLimiter, gmailController.connectGmail);
router.get('/gmail/callback', gmailController.gmailCallback);
router.post('/gmail/disconnect', gmailController.disconnectGmail);

// Trello authentication routes

router.get('/trello/connect', authLimiter, trelloController.connectTrello);
router.get('/trello/callback', trelloController.trelloCallback);
router.post('/trello/disconnect', trelloController.disconnectTrello);

// Auth status
router.get('/gmail/status', gmailController.getGmailStatus);
router.get('/trello/status', trelloController.getTrelloStatus);

// Test token generation (for development/testing)
router.post('/test-token', (req, res) => {
  try {
    const userId = req.body.userId || uuidv4();
    const token = generateToken(userId);

    res.json({
      success: true,
      data: {
        userId,
        token,
        expiresIn: '7d',
        note: 'This endpoint is for testing only. Remove in production.'
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
