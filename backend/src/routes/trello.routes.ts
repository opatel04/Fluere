import { Router } from 'express';
import { apiLimiter } from '../middleware/rateLimiter';
import * as trelloController from '../controllers/trello.controller';
import { verifyTrelloWebhook, webhookRateLimiter, webhookLogger } from '../middleware/webhookVerification';

const router = Router();

// Board routes
router.get('/boards', trelloController.getBoards);
router.get('/boards/:boardId', trelloController.getBoard);
router.get('/boards/:boardId/lists', trelloController.getLists);
router.get('/boards/:boardId/labels', trelloController.getLabels);

// Label routes
router.put('/labels/:labelId', apiLimiter, trelloController.updateLabel);

// List routes
router.get('/lists/:listId/cards', trelloController.getCards);

// Card routes
router.get('/cards/:cardId', trelloController.getCard);
router.post('/cards', apiLimiter, trelloController.createCard);
router.put('/cards/:cardId', apiLimiter, trelloController.updateCard);
router.delete('/cards/:cardId', trelloController.deleteCard);
router.post('/cards/:cardId/comments', apiLimiter, trelloController.addComment);

// Search
router.get('/search', trelloController.searchCards);

// Webhook - with verification middleware
router.post('/webhook',
  webhookLogger('trello'),
  webhookRateLimiter(100, 60000),
  verifyTrelloWebhook,
  trelloController.handleWebhook
);

// Sync endpoint (to be implemented with background jobs)
router.post('/sync', apiLimiter, (req, res) => {
  res.json({ message: 'Force sync with Trello endpoint - to be implemented' });
});

export default router;
