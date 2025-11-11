import { Request, Response } from 'express';
import ClientService from '../services/client.service';
import { asyncHandler } from '../middleware/errorHandler';
import { successResponse, successWithCount, createdResponse, listResponse } from '../utils/responses';
import { NotFoundError, ValidationError } from '../types/errors';

/**
 * Client Controller
 * Handles all client-related operations for freelancer client management
 */

const clientService = new ClientService();

/**
 * List all clients for the authenticated user
 * GET /api/v1/clients
 */
export const listClients = asyncHandler(async (
  req: Request,
  res: Response
): Promise<void> => {
    // userId is guaranteed by extractUserId middleware
    const userId = (req as any).userId;

    const filters = {
      status: req.query.status as 'active' | 'at_risk' | 'churned' | undefined,
      minHealthScore: req.query.minHealthScore ? parseInt(req.query.minHealthScore as string) : undefined,
      maxHealthScore: req.query.maxHealthScore ? parseInt(req.query.maxHealthScore as string) : undefined,
      searchQuery: req.query.search as string,
      sortBy: (req.query.sortBy as 'name' | 'last_contact' | 'health_score' | 'email_count') || 'last_contact',
      sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
    };

    const clients = await clientService.listClients(userId, filters);

    successWithCount(res, clients);
});

/**
 * Get client details by ID
 * GET /api/v1/clients/:id
 */
export const getClientDetails = asyncHandler(async (
  req: Request,
  res: Response
): Promise<void> => {
  // userId is guaranteed by extractUserId middleware
  const userId = (req as any).userId;
  const { id } = req.params;

  const details = await clientService.getClientDetails(id, userId);

  successResponse(res, details);
});

/**
 * Create a new client manually
 * POST /api/v1/clients
 */
export const createClient = asyncHandler(async (
  req: Request,
  res: Response
): Promise<void> => {
  // userId is guaranteed by extractUserId middleware
  const userId = (req as any).userId;
  const { email, name, company, phone, notes } = req.body;

  if (!email) {
    throw new ValidationError('Email is required', { field: 'email' });
  }

  // Check if client already exists
  const existing = await clientService.getClientByEmail(userId, email);
  if (existing) {
    throw new ValidationError('Client with this email already exists');
  }

  const clientId = await clientService.findOrCreateClient(userId, email, name);

  // Update additional fields if provided
  if (company || phone || notes) {
    await clientService.updateClient(clientId, userId, { company, phone, notes });
  }

  const client = await clientService.getClientById(clientId, userId);

  createdResponse(res, client);
});

/**
 * Update client information
 * PUT /api/v1/clients/:id
 */
export const updateClient = asyncHandler(async (
  req: Request,
  res: Response
): Promise<void> => {
  // userId is guaranteed by extractUserId middleware
  const userId = (req as any).userId;
  const { id } = req.params;
  const updates = req.body;

  const client = await clientService.updateClient(id, userId, updates);

  successResponse(res, client);
});

/**
 * Archive a client
 * DELETE /api/v1/clients/:id
 */
export const archiveClient = asyncHandler(async (
  req: Request,
  res: Response
): Promise<void> => {
  // userId is guaranteed by extractUserId middleware
  const userId = (req as any).userId;
  const { id } = req.params;

  await clientService.archiveClient(id, userId);

  successResponse(res, {}, 'Client archived successfully');
});

/**
 * Get all tasks for a client
 * GET /api/v1/clients/:id/tasks
 */
export const getClientTasks = asyncHandler(async (
  req: Request,
  res: Response
): Promise<void> => {
  // userId is guaranteed by extractUserId middleware
  const userId = (req as any).userId;
  const { id } = req.params;

  const filters = {
    status: req.query.status as string,
    isOverdue: req.query.isOverdue === 'true' ? true : req.query.isOverdue === 'false' ? false : undefined,
    limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
  };

  const tasks = await clientService.getClientTasks(id, userId, filters);

  successWithCount(res, tasks);
});

/**
 * Get all emails for a client
 * GET /api/v1/clients/:id/emails
 */
export const getClientEmails = asyncHandler(async (
  req: Request,
  res: Response
): Promise<void> => {
  // userId is guaranteed by extractUserId middleware
  const userId = (req as any).userId;
  const { id } = req.params;

  const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
  const emails = await clientService.getClientEmails(id, userId, limit);

  successWithCount(res, emails);
});

/**
 * Get activity timeline for a client
 * GET /api/v1/clients/:id/timeline
 */
export const getClientTimeline = asyncHandler(async (
  req: Request,
  res: Response
): Promise<void> => {
  // userId is guaranteed by extractUserId middleware
  const userId = (req as any).userId;
  const { id } = req.params;

  const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
  const timeline = await clientService.getClientTimeline(id, userId, limit);

  successWithCount(res, timeline);
});

/**
 * Get client statistics
 * GET /api/v1/clients/:id/stats
 */
export const getClientStats = asyncHandler(async (
  req: Request,
  res: Response
): Promise<void> => {
  // userId is guaranteed by extractUserId middleware
  const userId = (req as any).userId;
  const { id } = req.params;

  // Verify client belongs to user
  const client = await clientService.getClientById(id, userId);
  if (!client) {
    throw new NotFoundError('Client', id);
  }

  const stats = await clientService.getClientStats(id);

  successResponse(res, stats);
});

/**
 * Get at-risk clients (health score < 50)
 * GET /api/v1/clients/at-risk
 */
export const getAtRiskClients = asyncHandler(async (
  req: Request,
  res: Response
): Promise<void> => {
  // userId is guaranteed by extractUserId middleware
  const userId = (req as any).userId;

  const clients = await clientService.getAtRiskClients(userId);

  successWithCount(res, clients);
});

/**
 * Update client health score manually
 * POST /api/v1/clients/:id/health
 */
export const updateHealthScore = asyncHandler(async (
  req: Request,
  res: Response
): Promise<void> => {
  // userId is guaranteed by extractUserId middleware
  const userId = (req as any).userId;
  const { id } = req.params;

  // Verify client belongs to user
  const client = await clientService.getClientById(id, userId);
  if (!client) {
    throw new NotFoundError('Client', id);
  }

  const healthScore = await clientService.updateClientHealthScore(id);

  successResponse(res, { healthScore }, 'Health score updated successfully');
});

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
