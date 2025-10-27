import { Router } from 'express';
import { apiLimiter } from '../middleware/rateLimiter';
// import * as configController from '../controllers/config.controller';

const router = Router();

// User configuration routes
router.get('/preferences', (req, res) => {
  res.json({ message: 'Get user preferences endpoint - to be implemented' });
});

router.put('/preferences', apiLimiter, (req, res) => {
  res.json({ message: 'Update user preferences endpoint - to be implemented' });
});

// Routing rules
router.get('/rules', (req, res) => {
  res.json({ message: 'Get routing rules endpoint - to be implemented' });
});

router.post('/rules', apiLimiter, (req, res) => {
  res.json({ message: 'Create routing rule endpoint - to be implemented' });
});

router.put('/rules/:id', apiLimiter, (req, res) => {
  res.json({ message: `Update rule ${req.params.id} - to be implemented` });
});

router.delete('/rules/:id', (req, res) => {
  res.json({ message: `Delete rule ${req.params.id} - to be implemented` });
});

// Board mappings
router.get('/boards', (req, res) => {
  res.json({ message: 'Get board mappings endpoint - to be implemented' });
});

router.post('/boards', apiLimiter, (req, res) => {
  res.json({ message: 'Create board mapping endpoint - to be implemented' });
});

router.put('/boards/:id', apiLimiter, (req, res) => {
  res.json({ message: `Update board mapping ${req.params.id} - to be implemented` });
});

router.delete('/boards/:id', (req, res) => {
  res.json({ message: `Delete board mapping ${req.params.id} - to be implemented` });
});

export default router;
