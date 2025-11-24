import { Request, Response } from 'express';
import db from '../config/database';
import trelloService from '../services/trello.service';
import logger from '../config/logger';
import { asyncHandler } from '../middleware/errorHandler';
import { successResponse, createdResponse, listResponse } from '../utils/responses';
import { ValidationError, NotFoundError } from '../types/errors';

/**
 * Pending Task Controller
 * Manages tasks extracted by automation that are awaiting user approval
 */

/**
 * Get all pending tasks for the authenticated user
 * GET /api/v1/tasks/pending
 */
export const getPendingTasks = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).userId;
  const { status = 'pending', limit = 50, offset = 0 } = req.query;

  const result = await db.query(
    `SELECT * FROM pending_tasks
     WHERE user_id = $1 AND status = $2
     ORDER BY created_at DESC
     LIMIT $3 OFFSET $4`,
    [userId, status, limit, offset]
  );

  const countResult = await db.query(
    `SELECT COUNT(*) as total FROM pending_tasks WHERE user_id = $1 AND status = $2`,
    [userId, status]
  );

  const total = parseInt(countResult.rows[0].total);
  const limitNum = Number(limit);
  const offsetNum = Number(offset);
  const page = Math.floor(offsetNum / limitNum) + 1;

  listResponse(res, result.rows, {
    pagination: {
      page,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
      hasNext: offsetNum + limitNum < total,
      hasPrev: page > 1,
    },
  });
});

/**
 * Get pending task by ID
 * GET /api/v1/tasks/pending/:id
 */
export const getPendingTaskById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).userId;
  const { id } = req.params;

  const result = await db.query(
    `SELECT * FROM pending_tasks WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Pending task not found');
  }

  successResponse(res, result.rows[0]);
});

/**
 * Create a pending task (used by automation or manual extraction)
 * POST /api/v1/tasks/pending
 */
export const createPendingTask = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).userId;
  const {
    emailId,
    emailSubject,
    emailFrom,
    emailDate,
    title,
    description,
    priority = 'medium',
    category,
    dueDate,
    estimatedTime,
    labels = [],
    confidence,
    extractionSource = 'manual',
  } = req.body;

  if (!title) {
    throw new ValidationError('title is required');
  }

  const result = await db.query(
    `INSERT INTO pending_tasks (
      user_id, email_id, email_subject, email_from, email_date,
      title, description, priority, category, due_date, estimated_time,
      labels, confidence, extraction_source, status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'pending')
    RETURNING *`,
    [
      userId, emailId, emailSubject, emailFrom, emailDate,
      title, description, priority, category, dueDate, estimatedTime,
      JSON.stringify(labels), confidence, extractionSource,
    ]
  );

  createdResponse(res, result.rows[0]);
});

/**
 * Create multiple pending tasks (bulk)
 * POST /api/v1/tasks/pending/bulk
 */
export const createPendingTasksBulk = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).userId;
  const { tasks, emailContext } = req.body;

  if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
    throw new ValidationError('tasks array is required');
  }

  const createdTasks = [];

  for (const task of tasks) {
    const result = await db.query(
      `INSERT INTO pending_tasks (
        user_id, email_id, email_subject, email_from, email_date,
        title, description, priority, category, due_date, estimated_time,
        labels, confidence, extraction_source, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'pending')
      RETURNING *`,
      [
        userId,
        emailContext?.emailId || null,
        emailContext?.emailSubject || null,
        emailContext?.emailFrom || null,
        emailContext?.emailDate || null,
        task.name || task.title,
        task.description,
        task.priority || 'medium',
        task.category || null,
        task.dueDate || null,
        task.estimatedTime || null,
        JSON.stringify(task.labels || []),
        task.confidence || null,
        emailContext?.source || 'automation',
      ]
    );
    createdTasks.push(result.rows[0]);
  }

  logger.info(`Created ${createdTasks.length} pending tasks for user ${userId}`);

  createdResponse(res, {
    created: createdTasks.length,
    tasks: createdTasks,
  });
});

/**
 * Update a pending task
 * PUT /api/v1/tasks/pending/:id
 */
export const updatePendingTask = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).userId;
  const { id } = req.params;
  const { title, description, priority, category, dueDate, estimatedTime, labels } = req.body;

  // Check task exists and belongs to user
  const existing = await db.query(
    `SELECT * FROM pending_tasks WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );

  if (existing.rows.length === 0) {
    throw new NotFoundError('Pending task not found');
  }

  const result = await db.query(
    `UPDATE pending_tasks SET
      title = COALESCE($1, title),
      description = COALESCE($2, description),
      priority = COALESCE($3, priority),
      category = COALESCE($4, category),
      due_date = COALESCE($5, due_date),
      estimated_time = COALESCE($6, estimated_time),
      labels = COALESCE($7, labels),
      updated_at = NOW()
    WHERE id = $8 AND user_id = $9
    RETURNING *`,
    [title, description, priority, category, dueDate, estimatedTime, labels ? JSON.stringify(labels) : null, id, userId]
  );

  successResponse(res, result.rows[0]);
});

/**
 * Approve a pending task (create Trello card)
 * POST /api/v1/tasks/pending/:id/approve
 */
export const approvePendingTask = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).userId;
  const { id } = req.params;
  const { listId, boardId } = req.body;

  if (!listId) {
    throw new ValidationError('listId is required');
  }

  // Get the pending task
  const taskResult = await db.query(
    `SELECT * FROM pending_tasks WHERE id = $1 AND user_id = $2 AND status = 'pending'`,
    [id, userId]
  );

  if (taskResult.rows.length === 0) {
    throw new NotFoundError('Pending task not found or already processed');
  }

  const task = taskResult.rows[0];

  // Build card description
  let description = task.description || '';
  description += `\n\n---\n**Priority:** ${task.priority}`;
  if (task.category) description += `\n**Category:** ${task.category}`;
  if (task.estimated_time) description += `\n**Estimated Time:** ${task.estimated_time}`;
  if (task.email_subject) description += `\n\n*From email: ${task.email_subject}*`;

  // Create Trello card
  const card = await trelloService.createCard(userId, {
    name: task.title,
    desc: description,
    idList: listId,
    due: task.due_date,
    pos: 'top',
  });

  // Update pending task as approved
  await db.query(
    `UPDATE pending_tasks SET
      status = 'approved',
      approved_at = NOW(),
      board_id = $1,
      list_id = $2,
      trello_card_id = $3,
      updated_at = NOW()
    WHERE id = $4`,
    [boardId || null, listId, card.id, id]
  );

  logger.info(`Approved pending task ${id} -> Trello card ${card.id}`);

  successResponse(res, {
    message: 'Task approved and Trello card created',
    task: { ...task, status: 'approved' },
    card,
  });
});

/**
 * Approve multiple pending tasks (bulk)
 * POST /api/v1/tasks/pending/approve-bulk
 */
export const approvePendingTasksBulk = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).userId;
  const { taskIds, listId, boardId } = req.body;

  if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
    throw new ValidationError('taskIds array is required');
  }

  if (!listId) {
    throw new ValidationError('listId is required');
  }

  const results = {
    approved: 0,
    failed: 0,
    cards: [] as any[],
  };

  for (const taskId of taskIds) {
    try {
      // Get the pending task
      const taskResult = await db.query(
        `SELECT * FROM pending_tasks WHERE id = $1 AND user_id = $2 AND status = 'pending'`,
        [taskId, userId]
      );

      if (taskResult.rows.length === 0) {
        results.failed++;
        continue;
      }

      const task = taskResult.rows[0];

      // Build description
      let description = task.description || '';
      description += `\n\n---\n**Priority:** ${task.priority}`;
      if (task.category) description += `\n**Category:** ${task.category}`;
      if (task.email_subject) description += `\n\n*From email: ${task.email_subject}*`;

      // Create Trello card
      const card = await trelloService.createCard(userId, {
        name: task.title,
        desc: description,
        idList: listId,
        due: task.due_date,
        pos: 'top',
      });

      // Update pending task as approved
      await db.query(
        `UPDATE pending_tasks SET
          status = 'approved',
          approved_at = NOW(),
          board_id = $1,
          list_id = $2,
          trello_card_id = $3,
          updated_at = NOW()
        WHERE id = $4`,
        [boardId || null, listId, card.id, taskId]
      );

      results.approved++;
      results.cards.push(card);
    } catch (error) {
      logger.error(`Failed to approve task ${taskId}:`, error);
      results.failed++;
    }
  }

  logger.info(`Bulk approved ${results.approved} tasks for user ${userId}`);

  successResponse(res, results);
});

/**
 * Reject a pending task
 * POST /api/v1/tasks/pending/:id/reject
 */
export const rejectPendingTask = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).userId;
  const { id } = req.params;

  const result = await db.query(
    `UPDATE pending_tasks SET
      status = 'rejected',
      rejected_at = NOW(),
      updated_at = NOW()
    WHERE id = $1 AND user_id = $2 AND status = 'pending'
    RETURNING *`,
    [id, userId]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Pending task not found or already processed');
  }

  logger.info(`Rejected pending task ${id} for user ${userId}`);

  successResponse(res, {
    message: 'Task rejected',
    task: result.rows[0],
  });
});

/**
 * Reject multiple pending tasks (bulk)
 * POST /api/v1/tasks/pending/reject-bulk
 */
export const rejectPendingTasksBulk = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).userId;
  const { taskIds } = req.body;

  if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
    throw new ValidationError('taskIds array is required');
  }

  const result = await db.query(
    `UPDATE pending_tasks SET
      status = 'rejected',
      rejected_at = NOW(),
      updated_at = NOW()
    WHERE id = ANY($1) AND user_id = $2 AND status = 'pending'
    RETURNING id`,
    [taskIds, userId]
  );

  logger.info(`Bulk rejected ${result.rows.length} tasks for user ${userId}`);

  successResponse(res, {
    rejected: result.rows.length,
    taskIds: result.rows.map((r: any) => r.id),
  });
});

/**
 * Delete a pending task
 * DELETE /api/v1/tasks/pending/:id
 */
export const deletePendingTask = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).userId;
  const { id } = req.params;

  const result = await db.query(
    `DELETE FROM pending_tasks WHERE id = $1 AND user_id = $2 RETURNING id`,
    [id, userId]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Pending task not found');
  }

  successResponse(res, { message: 'Task deleted', id });
});

/**
 * Get pending task statistics
 * GET /api/v1/tasks/pending/stats
 */
export const getPendingTaskStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).userId;

  const result = await db.query(
    `SELECT
      COUNT(*) FILTER (WHERE status = 'pending') as pending,
      COUNT(*) FILTER (WHERE status = 'approved') as approved,
      COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
      COUNT(*) as total
    FROM pending_tasks
    WHERE user_id = $1`,
    [userId]
  );

  successResponse(res, result.rows[0]);
});
