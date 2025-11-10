import { Request, Response } from 'express';
import trelloService from '../services/trello.service';
import { asyncHandler } from '../middleware/errorHandler';
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

  res.json({
    success: true,
    data: {
      authUrl,
      message: 'Please visit the URL to authorize Trello access',
    },
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

  res.json({
    success: true,
    data: {
      message: 'Trello connected successfully',
      userId,
    },
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

  res.json({
    success: true,
    data: {
      message: 'Trello disconnected successfully',
    },
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

  res.json({
    success: true,
    data: {
      connected: isConnected,
      service: 'trello',
    },
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

  res.json({
    success: true,
    data: {
      boards,
      count: boards.length,
    },
  });
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

  res.json({
    success: true,
    data: { board },
  });
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

  res.json({
    success: true,
    data: {
      lists,
      count: lists.length,
    },
  });
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

  res.json({
    success: true,
    data: {
      cards,
      count: cards.length,
    },
  });
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

  res.json({
    success: true,
    data: { card },
  });
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

  res.status(201).json({
    success: true,
    data: { card },
  });
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

  res.json({
    success: true,
    data: { card },
  });
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

  res.json({
    success: true,
    data: {
      message: 'Card deleted successfully',
    },
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

  res.status(201).json({
    success: true,
    data: { comment },
  });
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

  res.json({
    success: true,
    data: {
      labels,
      count: labels.length,
    },
  });
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

  res.json({
    success: true,
    data: { label },
  });
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

  res.json({
    success: true,
    data: {
      cards,
      count: cards.length,
      query,
    },
  });
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
  res.status(200).json({
    success: true,
  });
});
