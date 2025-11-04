import { Router } from 'express';
import { authLimiter } from '../middleware/rateLimiter';
import * as gmailController from '../controllers/gmail.controller';
import * as trelloController from '../controllers/trello.controller';
import { generateToken } from '../middleware/auth.middleware';
import { v4 as uuidv4 } from 'uuid';
import db from '../config/database';
import logger from '../config/logger';

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

// Initialize temp user (for development/testing)
router.post('/init-temp-user', async (req, res) => {
  try {
    const email = req.body.email || 'temp@example.com';
    const userId = req.body.userId || uuidv4(); // Generate a real UUID

    // Create temp user if doesn't exist
    const result = await db.query(
      `INSERT INTO users (id, email, created_at, updated_at)
       VALUES ($1, $2, NOW(), NOW())
       ON CONFLICT (id) DO UPDATE SET email = $2, updated_at = NOW()
       RETURNING id, email`,
      [userId, email]
    );

    logger.info(`Initialized temp user: ${userId} with email: ${email}`);

    res.json({
      success: true,
      data: {
        userId: result.rows[0].id,
        email: result.rows[0].email,
        message: 'User initialized successfully. Use this userId to connect OAuth accounts.',
        note: 'Save this userId - you will need it for OAuth connections!'
      }
    });
  } catch (error: any) {
    logger.error('Error initializing temp user:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
