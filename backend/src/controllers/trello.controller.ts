import { Request, Response } from 'express';
import trelloService from '../services/trello.service';
import { asyncHandler } from '../middleware/errorHandler';
import { successResponse, successWithCount, createdResponse, listResponse } from '../utils/responses';
import { ValidationError } from '../types/errors';

/**
 * Trello Integration Controller
 * Handles Trello OAuth and card management
 */

/**
 * Initiate Trello OAuth flow
 * GET /api/v1/auth/trello/connect
 */
export const connectTrello = asyncHandler(async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = req.query.userId as string || (req as any).session?.userId || 'temp_user_id';
  const returnUrl = req.query.returnUrl as string;

  if (!userId) {
    throw new ValidationError('User ID is required');
  }

  const authUrl = trelloService.getAuthUrl(userId, returnUrl);

  successResponse(res, {
    authUrl,
    message: 'Please visit the URL to authorize Trello access',
  });
});

/**
 * Handle Trello OAuth callback
 * GET /api/v1/auth/trello/callback
 */
export const trelloCallback = asyncHandler(async (
  req: Request,
  res: Response
): Promise<void> => {
  // Trello returns token in fragment (#token=xxx), which is handled on client side
  // This endpoint receives the token from client-side JavaScript
  const { token } = req.query;
  const userId = req.query.state as string;

  if (!token || typeof token !== 'string') {
    throw new ValidationError('Trello token is required');
  }

  if (!userId) {
    throw new ValidationError('Invalid state parameter');
  }

  // Save token to database
  await trelloService.saveToken(userId, token);

  successResponse(res, {
    message: 'Trello connected successfully',
    userId,
  });
});

/**
 * Disconnect Trello account
 * POST /api/v1/auth/trello/disconnect
 */
export const disconnectTrello = asyncHandler(async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = req.body.userId || (req as any).session?.userId;

  if (!userId) {
    throw new ValidationError('User ID is required');
  }

  await trelloService.disconnect(userId);

  successResponse(res, {
    message: 'Trello disconnected successfully',
  });
});

/**
 * Get Trello connection status
 * GET /api/v1/auth/trello/status
 */
export const getTrelloStatus = asyncHandler(async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = req.query.userId as string || (req as any).session?.userId;

  if (!userId) {
    throw new ValidationError('User ID is required');
  }

  const isConnected = await trelloService.isConnected(userId);

  successResponse(res, {
    connected: isConnected,
    service: 'trello',
  });
});

/**
 * Get all Trello boards
 * GET /api/v1/trello/boards
 */
export const getBoards = asyncHandler(async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = req.query.userId as string || (req as any).session?.userId;

  if (!userId) {
    throw new ValidationError('User ID is required');
  }

  const boards = await trelloService.getBoards(userId);

  successWithCount(res, boards);
});

/**
 * Get a specific board
 * GET /api/v1/trello/boards/:boardId
 */
export const getBoard = asyncHandler(async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = req.query.userId as string || (req as any).session?.userId;
  const { boardId } = req.params;

  if (!userId) {
    throw new ValidationError('User ID is required');
  }

  const board = await trelloService.getBoard(userId, boardId);

  successResponse(res, { board });
});

/**
 * Get lists for a board
 * GET /api/v1/trello/boards/:boardId/lists
 */
export const getLists = asyncHandler(async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = req.query.userId as string || (req as any).session?.userId;
  const { boardId } = req.params;

  if (!userId) {
    throw new ValidationError('User ID is required');
  }

  const lists = await trelloService.getLists(userId, boardId);

  successWithCount(res, lists);
});

/**
 * Get cards from a list
 * GET /api/v1/trello/lists/:listId/cards
 */
export const getCards = asyncHandler(async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = req.query.userId as string || (req as any).session?.userId;
  const { listId } = req.params;

  if (!userId) {
    throw new ValidationError('User ID is required');
  }

  const cards = await trelloService.getCards(userId, listId);

  successWithCount(res, cards);
});

/**
 * Get a specific card
 * GET /api/v1/trello/cards/:cardId
 */
export const getCard = asyncHandler(async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = req.query.userId as string || (req as any).session?.userId;
  const { cardId } = req.params;

  if (!userId) {
    throw new ValidationError('User ID is required');
  }

  const card = await trelloService.getCard(userId, cardId);

  successResponse(res, { card });
});

/**
 * Create a new card
 * POST /api/v1/trello/cards
 */
export const createCard = asyncHandler(async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = req.body.userId || (req as any).session?.userId;
  const { name, desc, idList, due, pos, idLabels, idMembers } = req.body;

  if (!userId) {
    throw new ValidationError('User ID is required');
  }

  if (!name || !idList) {
    throw new ValidationError('Card name and list ID are required');
  }

  const card = await trelloService.createCard(userId, {
    name,
    desc,
    idList,
    due,
    pos,
    idLabels,
    idMembers,
  });

  createdResponse(res, { card });
});

/**
 * Update a card
 * PUT /api/v1/trello/cards/:cardId
 */
export const updateCard = asyncHandler(async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = req.body.userId || (req as any).session?.userId;
  const { cardId } = req.params;
  const { name, desc, idList, due, closed, pos } = req.body;

  if (!userId) {
    throw new ValidationError('User ID is required');
  }

  const card = await trelloService.updateCard(userId, cardId, {
    name,
    desc,
    idList,
    due,
    closed,
    pos,
  });

  successResponse(res, { card });
});

/**
 * Delete a card
 * DELETE /api/v1/trello/cards/:cardId
 */
export const deleteCard = asyncHandler(async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = req.query.userId as string || (req as any).session?.userId;
  const { cardId } = req.params;

  if (!userId) {
    throw new ValidationError('User ID is required');
  }

  await trelloService.deleteCard(userId, cardId);

  successResponse(res, {
    message: 'Card deleted successfully',
  });
});

/**
 * Add comment to card
 * POST /api/v1/trello/cards/:cardId/comments
 */
export const addComment = asyncHandler(async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = req.body.userId || (req as any).session?.userId;
  const { cardId } = req.params;
  const { text } = req.body;

  if (!userId) {
    throw new ValidationError('User ID is required');
  }

  if (!text) {
    throw new ValidationError('Comment text is required');
  }

  const comment = await trelloService.addComment(userId, cardId, text);

  createdResponse(res, { comment });
});

/**
 * Get labels for a board
 * GET /api/v1/trello/boards/:boardId/labels
 */
export const getLabels = asyncHandler(async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = req.query.userId as string || (req as any).session?.userId;
  const { boardId } = req.params;

  if (!userId) {
    throw new ValidationError('User ID is required');
  }

  const labels = await trelloService.getLabels(userId, boardId);

  successWithCount(res, labels);
});

/**
 * Update a label
 * PUT /api/v1/trello/labels/:labelId
 */
export const updateLabel = asyncHandler(async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = req.body.userId || (req as any).session?.userId;
  const { labelId } = req.params;
  const { name, color } = req.body;

  if (!userId) {
    throw new ValidationError('User ID is required');
  }

  const label = await trelloService.updateLabel(userId, labelId, name, color);

  successResponse(res, { label });
});

/**
 * Search for cards
 * GET /api/v1/trello/search
 */
export const searchCards = asyncHandler(async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = req.query.userId as string || (req as any).session?.userId;
  const query = req.query.q as string;
  const boardIds = req.query.boardIds
    ? (req.query.boardIds as string).split(',')
    : undefined;

  if (!userId) {
    throw new ValidationError('User ID is required');
  }

  if (!query) {
    throw new ValidationError('Search query is required');
  }

  const cards = await trelloService.searchCards(userId, query, boardIds);

  successWithCount(res, cards);
});

/**
 * Handle Trello webhook
 * POST /api/v1/trello/webhook
 *
 * Note: Webhooks should always return 200 to acknowledge receipt
 */
export const handleWebhook = asyncHandler(async (
  req: Request,
  res: Response
): Promise<void> => {
  // TODO: Process webhook data (req.body)
  // This would typically:
  // 1. Verify webhook signature
  // 2. Process the action (card created, updated, etc.)
  // 3. Update local database if needed

  // Acknowledge receipt
  successResponse(res, {}, 'Webhook received');
});
