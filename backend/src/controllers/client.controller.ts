import { Request, Response, NextFunction } from 'express';
import ClientService from '../services/client.service';
import logger from '../config/logger';

/**
 * Client Controller
 * Handles all client-related operations for freelancer client management
 */

const clientService = new ClientService();

/**
 * List all clients for the authenticated user
 * GET /api/v1/clients
 */
export const listClients = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }

    const filters = {
      status: req.query.status as 'active' | 'at_risk' | 'churned' | undefined,
      minHealthScore: req.query.minHealthScore ? parseInt(req.query.minHealthScore as string) : undefined,
      maxHealthScore: req.query.maxHealthScore ? parseInt(req.query.maxHealthScore as string) : undefined,
      searchQuery: req.query.search as string,
      sortBy: (req.query.sortBy as 'name' | 'last_contact' | 'health_score' | 'email_count') || 'last_contact',
      sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
    };

    const clients = await clientService.listClients(userId, filters);

    res.json({
      success: true,
      data: {
        clients,
        total: clients.length,
      },
    });
  } catch (error) {
    logger.error('Error in listClients controller:', error);
    next(error);
  }
};

/**
 * Get client details by ID
 * GET /api/v1/clients/:id
 */
export const getClientDetails = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }

    const details = await clientService.getClientDetails(id, userId);

    res.json({
      success: true,
      data: details,
    });
  } catch (error: any) {
    logger.error('Error in getClientDetails controller:', error);
    if (error.message === 'Client not found') {
      res.status(404).json({
        success: false,
        error: 'Client not found',
      });
      return;
    }
    next(error);
  }
};

/**
 * Create a new client manually
 * POST /api/v1/clients
 */
export const createClient = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.userId;
    const { email, name, company, phone, notes } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }

    if (!email) {
      res.status(400).json({
        success: false,
        error: 'Email is required',
      });
      return;
    }

    // Check if client already exists
    const existing = await clientService.getClientByEmail(userId, email);
    if (existing) {
      res.status(409).json({
        success: false,
        error: 'Client with this email already exists',
        data: existing,
      });
      return;
    }

    const clientId = await clientService.findOrCreateClient(userId, email, name);

    // Update additional fields if provided
    if (company || phone || notes) {
      await clientService.updateClient(clientId, userId, { company, phone, notes });
    }

    const client = await clientService.getClientById(clientId, userId);

    res.status(201).json({
      success: true,
      data: client,
    });
  } catch (error) {
    logger.error('Error in createClient controller:', error);
    next(error);
  }
};

/**
 * Update client information
 * PUT /api/v1/clients/:id
 */
export const updateClient = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const updates = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }

    const client = await clientService.updateClient(id, userId, updates);

    res.json({
      success: true,
      data: client,
    });
  } catch (error: any) {
    logger.error('Error in updateClient controller:', error);
    if (error.message === 'Client not found or unauthorized') {
      res.status(404).json({
        success: false,
        error: 'Client not found',
      });
      return;
    }
    next(error);
  }
};

/**
 * Archive a client
 * DELETE /api/v1/clients/:id
 */
export const archiveClient = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }

    await clientService.archiveClient(id, userId);

    res.json({
      success: true,
      message: 'Client archived successfully',
    });
  } catch (error) {
    logger.error('Error in archiveClient controller:', error);
    next(error);
  }
};

/**
 * Get all tasks for a client
 * GET /api/v1/clients/:id/tasks
 */
export const getClientTasks = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }

    const filters = {
      status: req.query.status as string,
      isOverdue: req.query.isOverdue === 'true' ? true : req.query.isOverdue === 'false' ? false : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
    };

    const tasks = await clientService.getClientTasks(id, userId, filters);

    res.json({
      success: true,
      data: {
        tasks,
        total: tasks.length,
      },
    });
  } catch (error) {
    logger.error('Error in getClientTasks controller:', error);
    next(error);
  }
};

/**
 * Get all emails for a client
 * GET /api/v1/clients/:id/emails
 */
export const getClientEmails = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }

    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const emails = await clientService.getClientEmails(id, userId, limit);

    res.json({
      success: true,
      data: {
        emails,
        total: emails.length,
      },
    });
  } catch (error) {
    logger.error('Error in getClientEmails controller:', error);
    next(error);
  }
};

/**
 * Get activity timeline for a client
 * GET /api/v1/clients/:id/timeline
 */
export const getClientTimeline = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }

    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
    const timeline = await clientService.getClientTimeline(id, userId, limit);

    res.json({
      success: true,
      data: {
        timeline,
        total: timeline.length,
      },
    });
  } catch (error) {
    logger.error('Error in getClientTimeline controller:', error);
    next(error);
  }
};

/**
 * Get client statistics
 * GET /api/v1/clients/:id/stats
 */
export const getClientStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }

    // Verify client belongs to user
    const client = await clientService.getClientById(id, userId);
    if (!client) {
      res.status(404).json({
        success: false,
        error: 'Client not found',
      });
      return;
    }

    const stats = await clientService.getClientStats(id);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Error in getClientStats controller:', error);
    next(error);
  }
};

/**
 * Get at-risk clients (health score < 50)
 * GET /api/v1/clients/at-risk
 */
export const getAtRiskClients = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }

    const clients = await clientService.getAtRiskClients(userId);

    res.json({
      success: true,
      data: {
        clients,
        total: clients.length,
      },
    });
  } catch (error) {
    logger.error('Error in getAtRiskClients controller:', error);
    next(error);
  }
};

/**
 * Update client health score manually
 * POST /api/v1/clients/:id/health
 */
export const updateHealthScore = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }

    // Verify client belongs to user
    const client = await clientService.getClientById(id, userId);
    if (!client) {
      res.status(404).json({
        success: false,
        error: 'Client not found',
      });
      return;
    }

    const healthScore = await clientService.updateClientHealthScore(id);

    res.json({
      success: true,
      data: {
        healthScore,
        message: 'Health score updated successfully',
      },
    });
  } catch (error) {
    logger.error('Error in updateHealthScore controller:', error);
    next(error);
  }
};

export default {
  listClients,
  getClientDetails,
  createClient,
  updateClient,
  archiveClient,
  getClientTasks,
  getClientEmails,
  getClientTimeline,
  getClientStats,
  getAtRiskClients,
  updateHealthScore,
};
