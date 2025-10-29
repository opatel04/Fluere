import { Router } from 'express';
import * as queueController from '../controllers/queue.controller';

const router = Router();

/**
 * Queue Status Routes
 * Base path: /api/v1/queue
 */

// Get overall queue status
router.get('/status', queueController.getStatus);

// Get user's jobs
router.get('/jobs/user/:userId', queueController.getUserJobs);

// Get job details
router.get('/jobs/:jobId/details', queueController.getJobDetails);

// Get user statistics
router.get('/stats/:userId', queueController.getUserStats);

export default router;
