import { Router } from 'express';
import { apiLimiter } from '../middleware/rateLimiter';
import * as clientController from '../controllers/client.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// All client routes require authentication
router.use(authenticateToken);

/**
 * Client Management Routes
 * All routes are prefixed with /api/v1/clients
 */

// Get at-risk clients (must be before /:id to avoid conflict)
router.get('/at-risk', apiLimiter, clientController.getAtRiskClients);

// List all clients with optional filters
router.get('/', apiLimiter, clientController.listClients);

// Create a new client manually
router.post('/', apiLimiter, clientController.createClient);

// Get client details by ID
router.get('/:id', apiLimiter, clientController.getClientDetails);

// Update client information
router.put('/:id', apiLimiter, clientController.updateClient);

// Archive a client (soft delete)
router.delete('/:id', apiLimiter, clientController.archiveClient);

// Get all tasks for a client
router.get('/:id/tasks', apiLimiter, clientController.getClientTasks);

// Get all emails for a client
router.get('/:id/emails', apiLimiter, clientController.getClientEmails);

// Get activity timeline for a client
router.get('/:id/timeline', apiLimiter, clientController.getClientTimeline);

// Get comprehensive statistics for a client
router.get('/:id/stats', apiLimiter, clientController.getClientStats);

// Update client health score manually
router.post('/:id/health', apiLimiter, clientController.updateHealthScore);

export default router;
