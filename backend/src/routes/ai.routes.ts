import { Router } from 'express';
import { aiLimiter } from '../middleware/rateLimiter';
import { authenticateToken, extractUserId } from '../middleware/auth.middleware';
import * as aiController from '../controllers/ai.controller';

const router = Router();

// All AI routes require authentication and userId extraction
router.use(authenticateToken);
router.use(extractUserId);

// Chatbot/Manual Input Feature
router.post('/extract-manual', aiLimiter, aiController.extractManualTasks);
router.post('/accept-tasks', aiLimiter, aiController.acceptSuggestedTasks);
router.post('/reject-tasks', aiLimiter, aiController.rejectSuggestedTasks);
router.put('/edit-suggestion/:tempId', aiLimiter, aiController.editSuggestedTask);

// Legacy/Future AI processing routes
router.post('/analyze-text', aiLimiter, (_req, res) => {
  res.json({ message: 'Analyze text endpoint - to be implemented' });
});

router.post('/extract-tasks', aiLimiter, (_req, res) => {
  res.json({ message: 'Extract tasks from email endpoint - to be implemented' });
});

router.post('/prioritize', aiLimiter, (_req, res) => {
  res.json({ message: 'Prioritize tasks endpoint - to be implemented' });
});

router.post('/categorize', aiLimiter, (_req, res) => {
  res.json({ message: 'Categorize task endpoint - to be implemented' });
});

router.post('/suggest-board', aiLimiter, (_req, res) => {
  res.json({ message: 'Suggest board for task endpoint - to be implemented' });
});

export default router;
