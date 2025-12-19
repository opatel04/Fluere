import { Request, Response } from 'express';
import scopeCreepService from '../services/scope-creep.service';
import logger from '../config/logger';

class ScopeCreepController {
    /**
     * Get alerts for a spec
     */
    async getAlerts(req: Request, res: Response) {
        try {
            const { specId } = req.params;
            const alerts = await scopeCreepService.getAlertsBySpec(specId);

            res.json({
                success: true,
                data: alerts
            });
        } catch (error) {
            logger.error('Error getting scope creep alerts:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get alerts'
            });
        }
    }

    /**
     * Resolve an alert
     */
    async resolveAlert(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { resolutionType } = req.body; // 'billed', 'spec_updated', 'ignored'

            const alert = await scopeCreepService.resolveAlert(id, resolutionType);

            res.json({
                success: true,
                data: alert
            });
        } catch (error) {
            logger.error('Error resolving scope creep alert:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to resolve alert'
            });
        }
    }

    /**
     * Generate email response for an alert
     */
    async generateResponse(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { tone } = req.body;

            // Validate tone
            const validTones = ['friendly', 'professional', 'firm'];
            if (!tone || !validTones.includes(tone)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid tone. Must be: friendly, professional, or firm'
                });
            }

            logger.info(`Generating ${tone} response for alert ${id}`);

            const response = await scopeCreepService.generateResponseForAlert(id, tone);

            return res.json({
                success: true,
                data: { response }
            });
        } catch (error: any) {
            logger.error('Error generating response:', error);

            // Check if it's a "not found" error
            if (error.message === 'Alert not found') {
                return res.status(404).json({
                    success: false,
                    error: 'Alert not found'
                });
            }

            return res.status(500).json({
                success: false,
                error: 'Failed to generate response'
            });
        }
    }
}

export default new ScopeCreepController();
