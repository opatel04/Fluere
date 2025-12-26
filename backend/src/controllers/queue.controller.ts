import { Request, Response } from 'express';
import { getQueueStatus } from '../config/queue';
import logger from '../config/logger';
import db from '../config/database';
import { asyncHandler } from '../middleware/errorHandler';
import { successResponse, successWithCount, createdResponse, listResponse } from '../utils/responses';
import { NotFoundError } from '../types/errors';

/**
 * Queue Status Controller
 * Provides information about background job queues
 */

/**
 * Get overall queue status
 * GET /api/v1/queue/status
 */
export const getStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const queueStats = await getQueueStatus();

  successResponse(res, {
    queues: queueStats,
    timestamp: new Date().toISOString(),
  });
});

/**
 * Get user's processing jobs
 * GET /api/v1/queue/jobs/:userId
 */
export const getUserJobs = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { userId } = req.params;
  const { status, limit = 50 } = req.query;

  let query = `
    SELECT
      id,
      job_type,
      job_status,
      job_data,
      result,
      error_message,
      started_at,
      completed_at,
      created_at
    FROM processing_jobs
    WHERE user_id = $1
  `;

  const params: any[] = [userId];

  if (status) {
    query += ` AND job_status = $2`;
    params.push(status);
  }

  query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
  params.push(Number(limit));

  const result = await db.query(query, params);

  successResponse(res, {
    jobs: result.rows,
    count: result.rows.length,
  });
});

/**
 * Get job details
 * GET /api/v1/queue/jobs/:jobId/details
 */
export const getJobDetails = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { jobId } = req.params;

  const result = await db.query(
    `SELECT
      id,
      user_id,
      job_type,
      job_status,
      job_data,
      result,
      error_message,
      started_at,
      completed_at,
      created_at
    FROM processing_jobs
    WHERE id = $1`,
    [jobId]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Job', jobId);
  }

  successResponse(res, result.rows[0]);
});

/**
 * Get processing statistics for a user
 * GET /api/v1/queue/stats/:userId
 */
export const getUserStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { userId } = req.params;

  const statsResult = await db.query(
    `SELECT
      job_status,
      job_type,
      COUNT(*) as count,
      AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_duration_seconds
    FROM processing_jobs
    WHERE user_id = $1
    GROUP BY job_status, job_type`,
    [userId]
  );

  const recentJobsResult = await db.query(
    `SELECT
      job_type,
      job_status,
      created_at,
      completed_at
    FROM processing_jobs
    WHERE user_id = $1
    ORDER BY created_at DESC
    LIMIT 10`,
    [userId]
  );

  successResponse(res, {
    statistics: statsResult.rows,
    recentJobs: recentJobsResult.rows,
  });
});
