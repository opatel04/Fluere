import { Request, Response, NextFunction } from 'express';
import trelloService from '../services/trello.service';
import logger from '../config/logger';

/**
 * Trello Integration Controller
 * Handles Trello OAuth and card management
 */

/**
 * Initiate Trello OAuth flow
 * GET /api/v1/auth/trello/connect
 */
export const connectTrello = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.query.userId as string || (req as any).session?.userId || 'temp_user_id';
    const returnUrl = req.query.returnUrl as string;

    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'User ID is required',
      });
      return;
    }

    const authUrl = trelloService.getAuthUrl(userId, returnUrl);

    res.json({
      success: true,
      data: {
        authUrl,
        message: 'Please visit the URL to authorize Trello access',
      },
    });
  } catch (error) {
    logger.error('Error in connectTrello controller:', error);
    next(error);
  }
};

/**
 * Handle Trello OAuth callback
 * GET /api/v1/auth/trello/callback
 */
export const trelloCallback = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Trello returns token in fragment (#token=xxx), which is handled on client side
    // This endpoint receives the token from client-side JavaScript
    const { token } = req.query;
    const userId = req.query.state as string;

    if (!token || typeof token !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Trello token is required',
      });
      return;
    }

    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'Invalid state parameter',
      });
      return;
    }

    // Save token to database
    await trelloService.saveToken(userId, token);

    logger.info(`Trello connected successfully for user ${userId}`);

    res.json({
      success: true,
      data: {
        message: 'Trello connected successfully',
        userId,
      },
    });
  } catch (error) {
    logger.error('Error in trelloCallback controller:', error);
    next(error);
  }
};

/**
 * Disconnect Trello account
 * POST /api/v1/auth/trello/disconnect
 */
export const disconnectTrello = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.body.userId || (req as any).session?.userId;

    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'User ID is required',
      });
      return;
    }

    await trelloService.disconnect(userId);

    res.json({
      success: true,
      data: {
        message: 'Trello disconnected successfully',
      },
    });
  } catch (error) {
    logger.error('Error in disconnectTrello controller:', error);
    next(error);
  }
};

/**
 * Get Trello connection status
 * GET /api/v1/auth/trello/status
 */
export const getTrelloStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.query.userId as string || (req as any).session?.userId;

    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'User ID is required',
      });
      return;
    }

    const isConnected = await trelloService.isConnected(userId);

    res.json({
      success: true,
      data: {
        connected: isConnected,
        service: 'trello',
      },
    });
  } catch (error) {
    logger.error('Error in getTrelloStatus controller:', error);
    next(error);
  }
};

/**
 * Get all Trello boards
 * GET /api/v1/trello/boards
 */
export const getBoards = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.query.userId as string || (req as any).session?.userId;

    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'User ID is required',
      });
      return;
    }

    const boards = await trelloService.getBoards(userId);

    res.json({
      success: true,
      data: {
        boards,
        count: boards.length,
      },
    });
  } catch (error) {
    logger.error('Error in getBoards controller:', error);
    next(error);
  }
};

/**
 * Get a specific board
 * GET /api/v1/trello/boards/:boardId
 */
export const getBoard = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.query.userId as string || (req as any).session?.userId;
    const { boardId } = req.params;

    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'User ID is required',
      });
      return;
    }

    const board = await trelloService.getBoard(userId, boardId);

    res.json({
      success: true,
      data: { board },
    });
  } catch (error) {
    logger.error('Error in getBoard controller:', error);
    next(error);
  }
};

/**
 * Get lists for a board
 * GET /api/v1/trello/boards/:boardId/lists
 */
export const getLists = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.query.userId as string || (req as any).session?.userId;
    const { boardId } = req.params;

    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'User ID is required',
      });
      return;
    }

    const lists = await trelloService.getLists(userId, boardId);

    res.json({
      success: true,
      data: {
        lists,
        count: lists.length,
      },
    });
  } catch (error) {
    logger.error('Error in getLists controller:', error);
    next(error);
  }
};

/**
 * Get cards from a list
 * GET /api/v1/trello/lists/:listId/cards
 */
export const getCards = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.query.userId as string || (req as any).session?.userId;
    const { listId } = req.params;

    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'User ID is required',
      });
      return;
    }

    const cards = await trelloService.getCards(userId, listId);

    res.json({
      success: true,
      data: {
        cards,
        count: cards.length,
      },
    });
  } catch (error) {
    logger.error('Error in getCards controller:', error);
    next(error);
  }
};

/**
 * Get a specific card
 * GET /api/v1/trello/cards/:cardId
 */
export const getCard = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.query.userId as string || (req as any).session?.userId;
    const { cardId } = req.params;

    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'User ID is required',
      });
      return;
    }

    const card = await trelloService.getCard(userId, cardId);

    res.json({
      success: true,
      data: { card },
    });
  } catch (error) {
    logger.error('Error in getCard controller:', error);
    next(error);
  }
};

/**
 * Create a new card
 * POST /api/v1/trello/cards
 */
export const createCard = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.body.userId || (req as any).session?.userId;
    const { name, desc, idList, due, pos, idLabels, idMembers } = req.body;

    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'User ID is required',
      });
      return;
    }

    if (!name || !idList) {
      res.status(400).json({
        success: false,
        error: 'Card name and list ID are required',
      });
      return;
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
  } catch (error) {
    logger.error('Error in createCard controller:', error);
    next(error);
  }
};

/**
 * Update a card
 * PUT /api/v1/trello/cards/:cardId
 */
export const updateCard = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.body.userId || (req as any).session?.userId;
    const { cardId } = req.params;
    const { name, desc, idList, due, closed, pos } = req.body;

    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'User ID is required',
      });
      return;
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
  } catch (error) {
    logger.error('Error in updateCard controller:', error);
    next(error);
  }
};

/**
 * Delete a card
 * DELETE /api/v1/trello/cards/:cardId
 */
export const deleteCard = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.query.userId as string || (req as any).session?.userId;
    const { cardId } = req.params;

    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'User ID is required',
      });
      return;
    }

    await trelloService.deleteCard(userId, cardId);

    res.json({
      success: true,
      data: {
        message: 'Card deleted successfully',
      },
    });
  } catch (error) {
    logger.error('Error in deleteCard controller:', error);
    next(error);
  }
};

/**
 * Add comment to card
 * POST /api/v1/trello/cards/:cardId/comments
 */
export const addComment = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.body.userId || (req as any).session?.userId;
    const { cardId } = req.params;
    const { text } = req.body;

    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'User ID is required',
      });
      return;
    }

    if (!text) {
      res.status(400).json({
        success: false,
        error: 'Comment text is required',
      });
      return;
    }

    const comment = await trelloService.addComment(userId, cardId, text);

    res.status(201).json({
      success: true,
      data: { comment },
    });
  } catch (error) {
    logger.error('Error in addComment controller:', error);
    next(error);
  }
};

/**
 * Get labels for a board
 * GET /api/v1/trello/boards/:boardId/labels
 */
export const getLabels = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.query.userId as string || (req as any).session?.userId;
    const { boardId } = req.params;

    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'User ID is required',
      });
      return;
    }

    const labels = await trelloService.getLabels(userId, boardId);

    res.json({
      success: true,
      data: {
        labels,
        count: labels.length,
      },
    });
  } catch (error) {
    logger.error('Error in getLabels controller:', error);
    next(error);
  }
};

/**
 * Update a label
 * PUT /api/v1/trello/labels/:labelId
 */
export const updateLabel = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.body.userId || (req as any).session?.userId;
    const { labelId } = req.params;
    const { name, color } = req.body;

    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'User ID is required',
      });
      return;
    }

    const label = await trelloService.updateLabel(userId, labelId, name, color);

    res.json({
      success: true,
      data: { label },
    });
  } catch (error) {
    logger.error('Error in updateLabel controller:', error);
    next(error);
  }
};

/**
 * Search for cards
 * GET /api/v1/trello/search
 */
export const searchCards = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.query.userId as string || (req as any).session?.userId;
    const query = req.query.q as string;
    const boardIds = req.query.boardIds
      ? (req.query.boardIds as string).split(',')
      : undefined;

    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'User ID is required',
      });
      return;
    }

    if (!query) {
      res.status(400).json({
        success: false,
        error: 'Search query is required',
      });
      return;
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
  } catch (error) {
    logger.error('Error in searchCards controller:', error);
    next(error);
  }
};

/**
 * Handle Trello webhook
 * POST /api/v1/trello/webhook
 */
export const handleWebhook = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const webhookData = req.body;

    logger.info('Received Trello webhook:', webhookData);

    // TODO: Process webhook data
    // This would typically:
    // 1. Verify webhook signature
    // 2. Process the action (card created, updated, etc.)
    // 3. Update local database if needed

    // Acknowledge receipt
    res.status(200).json({
      success: true,
    });
  } catch (error) {
    logger.error('Error in handleWebhook controller:', error);
    res.status(200).json({
      success: false,
      error: 'Webhook processing error',
    });
  }
};
