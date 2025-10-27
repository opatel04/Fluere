import { Router } from 'express';
import { aiLimiter } from '../middleware/rateLimiter';
// import * as aiController from '../controllers/ai.controller';

const router = Router();

// AI processing routes
router.post('/analyze-text', aiLimiter, (req, res) => {
  res.json({ message: 'Analyze text endpoint - to be implemented' });
});

router.post('/extract-tasks', aiLimiter, (req, res) => {
  res.json({ message: 'Extract tasks from email endpoint - to be implemented' });
});

router.post('/prioritize', aiLimiter, (req, res) => {
  res.json({ message: 'Prioritize tasks endpoint - to be implemented' });
});

router.post('/categorize', aiLimiter, (req, res) => {
  res.json({ message: 'Categorize task endpoint - to be implemented' });
});

router.post('/suggest-board', aiLimiter, (req, res) => {
  res.json({ message: 'Suggest board for task endpoint - to be implemented' });
});

export default router;
