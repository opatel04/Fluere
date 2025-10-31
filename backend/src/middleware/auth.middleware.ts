import { Request, Response, NextFunction } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import config from '../config/env';
import logger from '../config/logger';

/**
 * Authentication Middleware
 * Extracts userId from JWT token or session
 */

// Extend Express Request type to include userId
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

/**
 * Authenticate user from JWT token
 * Expects: Authorization: Bearer <token>
 */
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // "Bearer TOKEN"

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Access token required',
      });
      return;
    }

    // Verify token
    const decoded = jwt.verify(token, config.security.jwtSecret) as { userId: string };

    // Attach userId to request
    req.userId = decoded.userId;

    logger.info(`Authenticated user: ${req.userId}`);
    next();
  } catch (error: any) {
    logger.error('Authentication error:', error);

    if (error.name === 'JsonWebTokenError') {
      res.status(401).json({
        success: false,
        error: 'Invalid token',
      });
      return;
    }

    if (error.name === 'TokenExpiredError') {
      res.status(401).json({
        success: false,
        error: 'Token expired',
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Authentication failed',
    });
  }
};

/**
 * Optional authentication - doesn't fail if no token
 * Useful for endpoints that work with or without auth
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      try {
        const decoded = jwt.verify(token, config.security.jwtSecret) as { userId: string };
        req.userId = decoded.userId;
        logger.info(`Authenticated user (optional): ${req.userId}`);
      } catch (error) {
        // Token invalid but that's ok for optional auth
        logger.warn('Optional auth: Invalid token provided');
      }
    }

    next();
  } catch (error) {
    // Don't fail, just continue without userId
    next();
  }
};

/**
 * Fallback for development/testing
 * Accepts userId from body, query, or requires token
 */
export const flexibleAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Check for token first (production)
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      try {
        const decoded = jwt.verify(token, config.security.jwtSecret) as { userId: string };
        req.userId = decoded.userId;
        logger.info(`Authenticated via token: ${req.userId}`);
        next();
        return;
      } catch (error) {
        // Token invalid, fall through to other methods
      }
    }

    // Fallback: Check body or query (for testing/development)
    const userIdFromBody = req.body.userId;
    const userIdFromQuery = req.query.userId as string;

    if (userIdFromBody) {
      req.userId = userIdFromBody;
      logger.info(`Using userId from body (dev mode): ${req.userId}`);
      next();
      return;
    }

    if (userIdFromQuery) {
      req.userId = userIdFromQuery;
      logger.info(`Using userId from query (dev mode): ${req.userId}`);
      next();
      return;
    }

    // No userId found
    res.status(401).json({
      success: false,
      error: 'Authentication required. Provide token or userId (dev mode)',
    });
  } catch (error: any) {
    logger.error('Flexible auth error:', error);
    next(error);
  }
};

/**
 * Generate JWT token for user
 */
export const generateToken = (userId: string, expiresIn: string = '7d'): string => {
  // @ts-ignore - Type mismatch in jsonwebtoken types
  return jwt.sign(
    { userId },
    config.security.jwtSecret,
    { expiresIn }
  );
};

/**
 * Verify and decode token
 */
export const verifyToken = (token: string): { userId: string } | null => {
  try {
    return jwt.verify(token, config.security.jwtSecret) as { userId: string };
  } catch (error) {
    return null;
  }
};
