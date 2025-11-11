import { Response } from 'express';

/**
 * Standardized API Response Utility
 * All API responses follow this consistent structure for frontend predictability
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: ErrorDetails;
  meta?: ResponseMeta;
}

export interface ErrorDetails {
  code: string;
  message: string;
  details?: any;
  errorId?: string;
}

export interface ResponseMeta {
  timestamp: string;
  pagination?: PaginationMeta;
  count?: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Success response with data
 * Standard format: { success: true, data: T }
 */
export function successResponse<T>(
  res: Response,
  data: T,
  message?: string,
  statusCode: number = 200
): void {
  const response: ApiResponse<T> = {
    success: true,
    data,
    ...(message && { message }),
    meta: {
      timestamp: new Date().toISOString(),
    },
  };

  res.status(statusCode).json(response);
}

/**
 * Success response with pagination
 * Includes pagination metadata for list endpoints
 */
export function paginatedResponse<T>(
  res: Response,
  data: T[],
  pagination: PaginationMeta,
  message?: string
): void {
  const response: ApiResponse<T[]> = {
    success: true,
    data,
    ...(message && { message }),
    meta: {
      timestamp: new Date().toISOString(),
      pagination,
      count: data.length,
    },
  };

  res.status(200).json(response);
}

/**
 * Success response with count
 * For operations that return a collection
 */
export function successWithCount<T>(
  res: Response,
  data: T[],
  message?: string,
  statusCode: number = 200
): void {
  const response: ApiResponse<T[]> = {
    success: true,
    data,
    ...(message && { message }),
    meta: {
      timestamp: new Date().toISOString(),
      count: data.length,
    },
  };

  res.status(statusCode).json(response);
}

/**
 * Created response (201)
 * For POST operations that create new resources
 */
export function createdResponse<T>(
  res: Response,
  data: T,
  message?: string
): void {
  successResponse(res, data, message, 201);
}

/**
 * No content response (204)
 * For DELETE operations or operations with no return data
 */
export function noContentResponse(res: Response): void {
  res.status(204).send();
}

/**
 * Calculate pagination metadata
 * Helper to compute pagination values from query params
 */
export function calculatePagination(
  page: number,
  limit: number,
  total: number
): PaginationMeta {
  const totalPages = Math.ceil(total / limit);

  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

/**
 * Parse pagination params from request
 * Extracts and validates page/limit with defaults
 */
export function parsePaginationParams(query: any): { page: number; limit: number } {
  const page = Math.max(1, parseInt(query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit as string) || 20));

  return { page, limit };
}

/**
 * Format list response with optional pagination
 * Utility for list endpoints
 */
export function listResponse<T>(
  res: Response,
  items: T[],
  options?: {
    message?: string;
    pagination?: PaginationMeta;
  }
): void {
  if (options?.pagination) {
    paginatedResponse(res, items, options.pagination, options.message);
  } else {
    successWithCount(res, items, options?.message);
  }
}
