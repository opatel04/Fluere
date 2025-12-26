import { Router } from 'express';
import authRoutes from './auth.routes';
import emailRoutes from './email.routes';
import taskRoutes from './task.routes';
import trelloRoutes from './trello.routes';
import aiRoutes from './ai.routes';
import configRoutes from './config.routes';
import processRoutes from './process.routes';
import taskSortRoutes from './task-sort.routes';
import queueRoutes from './queue.routes';
import automationRoutes from './automation.routes';
import boardAutomationRoutes from './board-automation.routes';
import simpleBoardRoutes from './simple-board.routes';
import activityRoutes from './activity.routes';
import clientRoutes from './client.routes';
import userRoutes from './user.routes';
import followUpRoutes from './follow-up.routes';
import specRoutes from './spec.routes';

const router = Router();

// API Routes
router.use('/auth', authRoutes);
router.use('/emails', emailRoutes);
router.use('/tasks', taskRoutes);
router.use('/task-sort', taskSortRoutes); // Task sorting and filtering
router.use('/trello', trelloRoutes);
router.use('/ai', aiRoutes);
router.use('/config', configRoutes);
router.use('/process', processRoutes); // Email processing (Gmail → AI → Trello)
router.use('/queue', queueRoutes); // Background job queue monitoring
router.use('/automation', automationRoutes); // One-click automation
router.use('/board-automation', boardAutomationRoutes); // Board automation and card routing
router.use('/simple-board', simpleBoardRoutes); // Simple board setup (just create lists)
router.use('/activity', activityRoutes); // Activity logs and audit trail
router.use('/clients', clientRoutes); // Freelancer client management (NEW - Pivot Feature)
router.use('/users', userRoutes); // User account management (GDPR compliance)
router.use('/follow-ups', followUpRoutes); // Follow-up detection and management
router.use('/specs', specRoutes); // Project Scope Management

export default router;
