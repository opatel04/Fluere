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

    /**
     * Compare two spec versions
     * GET /api/v1/specs/:id/versions/compare?v1=1&v2=2
     */
    async compareVersions(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const { v1, v2 } = req.query;
            const userId = req.userId;

            if (!userId) throw new Error('User not authenticated');

            // Validate query parameters
            if (!v1 || !v2) {
                res.status(400).json({
                    success: false,
                    error: 'Both v1 and v2 query parameters are required'
                });
                return;
            }

            const version1 = parseInt(v1 as string);
            const version2 = parseInt(v2 as string);

            if (isNaN(version1) || isNaN(version2)) {
                res.status(400).json({
                    success: false,
                    error: 'Version numbers must be valid integers'
                });
                return;
            }

            if (version1 === version2) {
                res.status(400).json({
                    success: false,
                    error: 'Cannot compare a version with itself'
                });
                return;
            }

            // Verify user owns the spec
            const spec = await specService.getSpec(id);
            if (spec.spec.user_id !== userId) {
                res.status(403).json({
                    success: false,
                    error: 'Access denied'
                });
                return;
            }

            const comparison = await specService.compareVersions(id, version1, version2);

            // Disable caching for comparison results
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');

            res.status(200).json({
                success: true,
                data: comparison
            });
        } catch (error: any) {
            if (error.message === 'One or both versions not found') {
                res.status(404).json({
                    success: false,
                    error: 'One or both versions not found'
                });
                return;
            }
            next(error);
        }
    }
}

export default new SpecController();
