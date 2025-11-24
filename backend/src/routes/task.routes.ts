import { Router } from 'express';
import { authenticateToken, extractUserId } from '../middleware/auth.middleware';
import { apiLimiter } from '../middleware/rateLimiter';
import * as pendingTaskController from '../controllers/pending-task.controller';

const router = Router();

/**
 * Task Routes
 * Base path: /api/v1/tasks
 *
 * Manages pending tasks (extracted by automation, awaiting approval)
 */

// All task routes require authentication
router.use(authenticateToken);
router.use(extractUserId);

// Pending tasks - Statistics (must be before :id routes)
router.get('/pending/stats', pendingTaskController.getPendingTaskStats);

// Pending tasks - Bulk operations
router.post('/pending/bulk', apiLimiter, pendingTaskController.createPendingTasksBulk);
router.post('/pending/approve-bulk', apiLimiter, pendingTaskController.approvePendingTasksBulk);
router.post('/pending/reject-bulk', apiLimiter, pendingTaskController.rejectPendingTasksBulk);

// Pending tasks - List and create
router.get('/pending', pendingTaskController.getPendingTasks);
router.post('/pending', apiLimiter, pendingTaskController.createPendingTask);

// Pending tasks - Single task operations
router.get('/pending/:id', pendingTaskController.getPendingTaskById);
router.put('/pending/:id', apiLimiter, pendingTaskController.updatePendingTask);
router.delete('/pending/:id', apiLimiter, pendingTaskController.deletePendingTask);

// Pending tasks - Approve/Reject
router.post('/pending/:id/approve', apiLimiter, pendingTaskController.approvePendingTask);
router.post('/pending/:id/reject', apiLimiter, pendingTaskController.rejectPendingTask);

// Pending tasks - Generate AI description on-demand (lazy loading)
router.post('/pending/:id/generate', apiLimiter, pendingTaskController.generateTaskDescription);

export default router;
