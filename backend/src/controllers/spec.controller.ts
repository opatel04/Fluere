import { Request, Response, NextFunction } from 'express';
import specService from '../services/spec.service';
import scopeManagementService from '../services/scope-management.service';
import logger from '../config/logger';

class SpecController {
    /**
     * Generate a draft spec from an email
     * POST /api/v1/specs/generate
     */
    async generateSpec(req: Request, res: Response, next: NextFunction) {
        try {
            const { emailId } = req.body;
            const userId = req.userId;

            if (!userId) throw new Error('User not authenticated');
            if (!emailId) throw new Error('Email ID is required');

            const result = await scopeManagementService.generateSpecFromEmail(userId, emailId);

            res.status(201).json({
                success: true,
                data: result,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get a spec by ID
     * GET /api/v1/specs/:id
     */
    async getSpec(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const result = await specService.getSpec(id);

            res.status(200).json({
                success: true,
                data: result,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Update a spec
     * PUT /api/v1/specs/:id
     */
    async updateSpec(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const userId = req.userId;
            if (!userId) throw new Error('User not authenticated');

            const result = await specService.updateSpec(id, userId, req.body);

            res.status(200).json({
                success: true,
                data: result,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Lock a spec
     * POST /api/v1/specs/:id/lock
     */
    async lockSpec(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const result = await specService.lockSpec(id);

            res.status(200).json({
                success: true,
                data: result,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Sync spec to Trello
     * POST /api/v1/specs/:id/sync-trello
     */
    async syncToTrello(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            await specService.syncToTrello(id);

            res.status(200).json({
                success: true,
                message: 'Spec synced to Trello successfully',
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get version history
     * GET /api/v1/specs/:id/versions
     */
    async getVersions(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const result = await specService.getVersionHistory(id);

            res.status(200).json({
                success: true,
                data: result,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * List all specs
     * GET /api/v1/specs
     */
    async listSpecs(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.userId;
            if (!userId) throw new Error('User not authenticated');

            const result = await specService.listSpecs(userId);

            res.status(200).json({
                success: true,
                data: result,
            });
        } catch (error) {
            next(error);
        }
    }
    /**
     * Chat with spec to edit it
     * POST /api/v1/specs/:id/chat
     */
    async chatWithSpec(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const { message } = req.body;
            const userId = req.userId;

            if (!userId) throw new Error('User not authenticated');
            if (!message) throw new Error('Message is required');

            const result = await scopeManagementService.processChatEdit(userId, id, message);

            res.status(200).json({
                success: true,
                data: result,
            });
        } catch (error) {
            next(error);
        }
    }
}

export default new SpecController();
