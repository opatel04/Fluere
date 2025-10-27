import { Router } from 'express';
import authRoutes from './auth.routes';
import emailRoutes from './email.routes';
import taskRoutes from './task.routes';
import trelloRoutes from './trello.routes';
import aiRoutes from './ai.routes';
import configRoutes from './config.routes';
import processRoutes from './process.routes';
import taskSortRoutes from './task-sort.routes';

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

export default router;
