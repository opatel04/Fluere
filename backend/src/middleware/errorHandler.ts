/**
 * Global Error Handler Middleware
 *
 * Production-grade error handling that:
 * - Logs all errors with full context
 * - Returns consistent JSON responses
 * - Hides internal errors in production
 * - Includes stack traces in development
 * - Never crashes the server
 */

import { Request, Response, NextFunction } from 'express';
import { AppError, isAppError, isOperationalError } from '../types/errors';
import logger from '../config/logger';

/**
 * Global error handler middleware
 * MUST be registered AFTER all routes in Express app
 *
 * Design decisions:
 * - Non-operational errors (programming errors) get generic message in production
 * - All errors logged with full context for debugging
 * - Error IDs allow correlation between client reports and server logs
 * - Stack traces only in development (security)
 */
export const globalErrorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // If response already sent, delegate to default Express error handler
  if (res.headersSent) {
    logger.warn('Error occurred after headers sent', {
      error: err.message,
      path: req.path,
    });
    return next(err);
  }

  // Determine error properties
  const statusCode = isAppError(err) ? err.statusCode : 500;
  const errorCode = isAppError(err) ? err.code : 'INTERNAL_ERROR';
  const errorId = isAppError(err) ? err.errorId : generateErrorId();
  const isOperational = isOperationalError(err);

  // Log error with full context
  logError(err, req, errorId, statusCode);

  // Build response
  const errorResponse = buildErrorResponse(
    err,
    errorId,
    errorCode,
    isOperational
  );

  // Send response
  res.status(statusCode).json(errorResponse);
};

/**
 * Log error with full request context
 * Critical for debugging production issues
 */
function logError(
  err: Error | AppError,
  req: Request,
  errorId: string,
  statusCode: number
): void {
  const logLevel = statusCode >= 500 ? 'error' : 'warn';

  const logContext: Record<string, any> = {
    errorId,
    statusCode,
    userId: (req as any).userId || 'unauthenticated',
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    timestamp: new Date().toISOString(),
    message: err.message,
  };

  // Add AppError-specific details
  if (isAppError(err)) {
    if (err.details) logContext.details = err.details;
    if (err.cause) logContext.cause = err.cause instanceof Error ? err.cause.message : String(err.cause);
  }

  // Stack trace always logged server-side (never sent to client in production)
  if (err.stack) {
    logContext.stack = err.stack;
  }

  logger[logLevel]('Request failed', logContext);
}

/**
 * Build consistent error response
 * Operational errors: show details
 * Non-operational errors: hide details in production
 */
function buildErrorResponse(
  err: Error | AppError,
  errorId: string,
  errorCode: string,
  isOperational: boolean
): ErrorResponse {
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Base error response
  const response: ErrorResponse = {
    success: false,
    error: {
      code: errorCode,
      message: getMessage(err, isOperational, isDevelopment),
      errorId,
    },
  };

  // Add details if operational error (safe to show user)
  if (isOperational && isAppError(err) && err.details) {
    response.error.details = err.details;
  }

  // Add stack trace ONLY in development
  if (isDevelopment && err.stack) {
    response.error.stack = err.stack;
  }

  return response;
}

/**
 * Get error message based on environment and error type
 *
 * Production:
 *   - Operational errors: show actual message (safe)
 *   - Non-operational errors: generic message (security)
 *
 * Development:
 *   - Always show actual message (debugging)
 */
function getMessage(
  err: Error | AppError,
  isOperational: boolean,
  isDevelopment: boolean
): string {
  // Development: always show real message
  if (isDevelopment) {
    return err.message;
  }

  // Production operational error: show real message (safe)
  if (isOperational) {
    return err.message;
  }

  // Production non-operational error: generic message (security)
  return 'An unexpected error occurred. Please contact support with error ID.';
}

/**
 * Generate error ID for non-AppError errors
 */
function generateErrorId(): string {
  return `err_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

// ============================================================================
// ASYNC HANDLER WRAPPER
// ============================================================================

/**
 * Async handler wrapper - eliminates try-catch blocks in controllers
 *
 * Usage:
 *   export const getProfile = asyncHandler(async (req, res) => {
 *     const profile = await userService.getProfile(userId);
 *     if (!profile) throw new NotFoundError('User');
 *     res.json(successResponse(profile));
 *   });
 *
 * Before (ugly):
 *   try {
 *     const profile = await userService.getProfile(userId);
 *     if (!profile) return res.status(404).json({ error: 'Not found' });
 *     res.json({ success: true, data: profile });
 *   } catch (error) {
 *     logger.error('Error:', error);
 *     res.status(500).json({ error: 'Failed' });
 *   }
 *
 * After (clean):
 *   const profile = await userService.getProfile(userId);
 *   if (!profile) throw new NotFoundError('User');
 *   res.json(successResponse(profile));
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// ============================================================================
// 404 HANDLER (for undefined routes)
// ============================================================================

/**
 * 404 Not Found handler for undefined routes
 * Register this AFTER all defined routes but BEFORE error handler
 */
export const notFoundHandler = (
  req: Request,
  res: Response
): void => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
      errorId: generateErrorId(),
    },
  });
};

// ============================================================================
// TYPES
// ============================================================================

interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    errorId: string;
    details?: Record<string, any>;
    stack?: string; // Only in development
  };
}
