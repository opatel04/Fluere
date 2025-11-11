import { Request, Response } from 'express';
import userService from '../services/user.service';
import { UserAccount, ValidationMessages, ApiMessages } from '../config/constants';
import { asyncHandler } from '../middleware/errorHandler';
import { NotFoundError, ValidationError } from '../types/errors';
import { successResponse } from '../utils/responses';

/**
 * Get user profile
 * GET /api/v1/users/profile
 */
export const getProfile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  // userId is guaranteed by extractUserId middleware
  const userId = (req as any).userId;

  const profile = await userService.getProfile(userId);

  if (!profile) {
    throw new NotFoundError('User profile');
  }

  successResponse(res, { profile });
});

/**
 * Update user profile
 * PUT /api/v1/users/profile
 */
export const updateProfile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  // userId is guaranteed by extractUserId middleware
  const userId = (req as any).userId;
  const { email, name } = req.body;

  // Validate at least one field is provided
  if (!email && !name) {
    throw new ValidationError(ValidationMessages.PROFILE_UPDATE_REQUIRED);
  }

  // Validate email format if provided
  if (email && !UserAccount.EMAIL_REGEX.test(email)) {
    throw new ValidationError(ValidationMessages.INVALID_EMAIL, { field: 'email' });
  }

  const updatedProfile = await userService.updateProfile(userId, { email, name });

  successResponse(res, { profile: updatedProfile }, ApiMessages.PROFILE_UPDATED);
});

/**
 * Export user data (GDPR compliance)
 * GET /api/v1/users/export
 */
export const exportUserData = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  // userId is guaranteed by extractUserId middleware
  const userId = (req as any).userId;

  const userData = await userService.exportUserData(userId);

  // Set headers for file download
  res.setHeader('Content-Type', 'application/json');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="tasksnap-user-data-${userId}-${Date.now()}.json"`
  );

  successResponse(res, {
    exportDate: new Date().toISOString(),
    userId,
    data: userData,
    notice: ApiMessages.DATA_EXPORT_NOTICE,
  });
});

/**
 * Delete user account (GDPR compliance)
 * DELETE /api/v1/users/account
 */
export const deleteAccount = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  // userId is guaranteed by extractUserId middleware
  const userId = (req as any).userId;
  const { confirmation } = req.body;

  // Require confirmation
  if (confirmation !== UserAccount.DELETE_CONFIRMATION) {
    throw new ValidationError(ValidationMessages.DELETE_CONFIRMATION_REQUIRED);
  }

  const result = await userService.deleteAccount(userId);

  successResponse(res, { deletedRecords: result.deletedRecords }, ApiMessages.ACCOUNT_DELETED);
});

/**
 * Get account statistics
 * GET /api/v1/users/stats
 */
export const getAccountStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  // userId is guaranteed by extractUserId middleware
  const userId = (req as any).userId;

  const userData = await userService.exportUserData(userId);

  successResponse(res, {
    profile: userData.profile,
    stats: userData.stats,
  });
});
