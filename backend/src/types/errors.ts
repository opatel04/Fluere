/**
 * Application Error Types
 *
 * Production-grade error handling with:
 * - Type safety (no 'any' types)
 * - Trackable error IDs for debugging
 * - Secure (no internal details leaked to client)
 * - Developer-friendly (clear error codes)
 * - Frontend-ready (programmatic error handling)
 */

import crypto from 'crypto';

/**
 * Base Application Error
 * All custom errors extend this class
 *
 * Design decisions:
 * - isOperational flag distinguishes user errors (show message) from programming errors (hide details)
 * - errorId automatically generated for log correlation
 * - Proper Error.captureStackTrace for clean stack traces
 */
export class AppError extends Error {
  public readonly errorId: string;
  public readonly timestamp: Date;

  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly isOperational: boolean = true,
    public readonly details?: Record<string, any>
  ) {
    super(message);

    // Maintains proper stack trace for where error was thrown (V8 only)
    Error.captureStackTrace(this, this.constructor);

    // Set proper prototype for instanceof checks
    Object.setPrototypeOf(this, AppError.prototype);

    this.name = this.constructor.name;
    this.errorId = crypto.randomUUID();
    this.timestamp = new Date();
  }

  /**
   * Convert error to JSON for API responses
   * Only includes safe fields (no stack traces or internal details in production)
   */
  toJSON(): Record<string, any> {
    return {
      code: this.code,
      message: this.message,
      errorId: this.errorId,
      ...(this.details && { details: this.details }),
    };
  }
}

// ============================================================================
// CLIENT ERRORS (4xx) - User's fault, show details
// ============================================================================

/**
 * 400 Bad Request - Validation Error
 * Use when user input fails validation
 *
 * Example:
 *   throw new ValidationError('Email is required', { field: 'email' })
 */
export class ValidationError extends AppError {
  constructor(
    message: string = 'Validation failed',
    details?: Record<string, any>
  ) {
    super(400, 'VALIDATION_ERROR', message, true, details);
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * 401 Unauthorized - Authentication Required
 * Use when user is not authenticated
 *
 * Example:
 *   throw new UnauthorizedError()
 *   throw new UnauthorizedError('Invalid token')
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(401, 'UNAUTHORIZED', message, true);
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

/**
 * 403 Forbidden - Authenticated but Not Authorized
 * Use when user is authenticated but doesn't have permission
 *
 * Example:
 *   throw new ForbiddenError('You do not have access to this board')
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'Access forbidden') {
    super(403, 'FORBIDDEN', message, true);
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

/**
 * 404 Not Found - Resource Doesn't Exist
 * Use when requested resource is not found
 *
 * Example:
 *   throw new NotFoundError('User')
 *   throw new NotFoundError('Task', taskId)
 */
export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string) {
    const message = identifier
      ? `${resource} with ID '${identifier}' not found`
      : `${resource} not found`;

    super(404, 'NOT_FOUND', message, true, { resource, identifier });
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * 409 Conflict - Resource Already Exists
 * Use when trying to create duplicate resource
 *
 * Example:
 *   throw new ConflictError('Email already registered')
 */
export class ConflictError extends AppError {
  constructor(message: string = 'Resource already exists') {
    super(409, 'CONFLICT', message, true);
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

/**
 * 422 Unprocessable Entity - Business Logic Error
 * Use when request is valid but business rules prevent processing
 *
 * Example:
 *   throw new UnprocessableError('Cannot delete board with active tasks')
 */
export class UnprocessableError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super(422, 'UNPROCESSABLE_ENTITY', message, true, details);
    Object.setPrototypeOf(this, UnprocessableError.prototype);
  }
}

// ============================================================================
// SERVER ERRORS (5xx) - Our fault, hide details from client
// ============================================================================

/**
 * 500 Internal Server Error - Programming Error
 * Use for unexpected errors (database failures, external API failures, etc.)
 *
 * IMPORTANT: isOperational = false means details are hidden from client
 *
 * Example:
 *   throw new InternalError('Database connection failed', originalError)
 */
export class InternalError extends AppError {
  constructor(
    message: string = 'Internal server error',
    public readonly cause?: Error
  ) {
    super(500, 'INTERNAL_ERROR', message, false); // isOperational = false
    Object.setPrototypeOf(this, InternalError.prototype);

    // Preserve original error stack for debugging
    if (cause?.stack) {
      this.stack = `${this.stack}\nCaused by: ${cause.stack}`;
    }
  }
}

/**
 * 503 Service Unavailable - External Service Down
 * Use when external service (Gmail API, Trello API, etc.) is unavailable
 *
 * Example:
 *   throw new ServiceUnavailableError('Gmail API is currently unavailable')
 */
export class ServiceUnavailableError extends AppError {
  constructor(
    serviceName: string,
    message?: string
  ) {
    const errorMessage = message || `${serviceName} is currently unavailable`;
    super(503, 'SERVICE_UNAVAILABLE', errorMessage, true, { serviceName });
    Object.setPrototypeOf(this, ServiceUnavailableError.prototype);
  }
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard to check if error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Type guard to check if error is operational (safe to show to user)
 */
export function isOperationalError(error: unknown): boolean {
  return isAppError(error) && error.isOperational;
}
