import { Request, Response, NextFunction } from 'express';
import { getQueueStatus } from '../config/queue';
import logger from '../config/logger';
import db from '../config/database';

/**
 * Queue Status Controller
 * Provides information about background job queues
 */

/**
 * Get overall queue status
 * GET /api/v1/queue/status
 */
export const getStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const queueStats = await getQueueStatus();

    res.json({
      success: true,
      data: {
        queues: queueStats,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Error in getStatus controller:', error);
    next(error);
  }
};

/**
 * Get user's processing jobs
 * GET /api/v1/queue/jobs/:userId
 */
export const getUserJobs = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
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

    res.json({
      success: true,
      data: {
        jobs: result.rows,
        count: result.rows.length,
      },
    });
  } catch (error) {
    logger.error('Error in getUserJobs controller:', error);
    next(error);
  }
};

/**
 * Get job details
 * GET /api/v1/queue/jobs/:jobId/details
 */
export const getJobDetails = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
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
      res.status(404).json({
        success: false,
        error: 'Job not found',
      });
      return;
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    logger.error('Error in getJobDetails controller:', error);
    next(error);
  }
};

/**
 * Get processing statistics for a user
 * GET /api/v1/queue/stats/:userId
 */
export const getUserStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
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

    res.json({
      success: true,
      data: {
        statistics: statsResult.rows,
        recentJobs: recentJobsResult.rows,
      },
    });
  } catch (error) {
    logger.error('Error in getUserStats controller:', error);
    next(error);
  }
};
