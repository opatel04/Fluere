import { Router } from 'express';
import specController from '../controllers/spec.controller';
import scopeCreepController from '../controllers/scope-creep.controller';
import { authenticateToken as requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Apply auth middleware to all routes
router.use(requireAuth);

// Generate draft spec from email
router.post('/generate', requireAuth, specController.generateSpec);
router.get('/', requireAuth, specController.listSpecs);
// Get spec by ID
router.get('/:id', requireAuth, specController.getSpec);

// Update spec
router.put('/:id', specController.updateSpec);

// Lock spec
router.post('/:id/lock', specController.lockSpec);

// Sync to Trello
router.post('/:id/sync-trello', specController.syncToTrello);

// Get version history
router.get('/:id/versions', specController.getVersions);

// Chat with spec
router.post('/:id/chat', specController.chatWithSpec);

// Scope Creep Alerts
router.get('/:specId/alerts', requireAuth, scopeCreepController.getAlerts);
router.post('/alerts/:id/resolve', requireAuth, scopeCreepController.resolveAlert);

export default router;
