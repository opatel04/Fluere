import { Router } from 'express';
import { authLimiter } from '../middleware/rateLimiter';
import * as gmailController from '../controllers/gmail.controller';
import * as trelloController from '../controllers/trello.controller';

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

export default router;
