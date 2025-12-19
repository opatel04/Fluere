import db from '../config/database';
import logger from '../config/logger';
import { ScopeCreepResult } from '../types/ai.types';
import aiService from './ai.service';
import specService from './spec.service';
import { SpecContent, SpecItem } from '../types/spec.types';
import { v4 as uuidv4 } from 'uuid';

export interface CreateScopeCreepAlertDTO {
    spec_id: string;
    email_id: string;
    client_id: string;
    result: ScopeCreepResult;
}

class ScopeCreepService {
    /**
     * Create multiple scope creep alerts from detection array
     * This is the new method that handles multiple detections per email
     */
    async createAlerts(data: CreateScopeCreepAlertDTO) {
        try {
            const { spec_id, email_id, client_id, result } = data;
            const alerts: any[] = [];

            // Create one alert per detection
            for (const detection of result.detections) {
                const alertResult = await db.query(
                    `INSERT INTO scope_creep_alerts (
            spec_id, email_id, client_id, severity, category,
            client_quote, ai_summary, ai_reasoning, estimated_hours,
            detected_deviation, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending')
          RETURNING *`,
                    [
                        spec_id,
                        email_id,
                        client_id,
                        detection.severity,
                        detection.category,
                        detection.clientQuote,
                        result.summary || detection.reasoning, // Use overall summary if available
                        detection.reasoning,
                        detection.estimatedHours,
                        JSON.stringify(detection.detectedDeviation),
                    ]
                );

                alerts.push(alertResult.rows[0]);
            }

            logger.info(
                `Created ${alerts.length} scope creep alert(s) for spec ${spec_id}`,
                { email_id, severities: alerts.map(a => a.severity) }
            );
            return alerts;
        } catch (error) {
            logger.error('Error creating scope creep alerts:', error);
            throw error;
        }
    }

    /**
     * Create a single scope creep alert
     * @deprecated Use createAlerts() instead for multi-detection support
     * Kept for backwards compatibility
     */
    async createAlert(data: CreateScopeCreepAlertDTO) {
        try {
            const result = await db.query(
                `INSERT INTO scope_creep_alerts (
          spec_id, email_id, client_id, severity, category,
          client_quote, ai_summary, ai_reasoning, estimated_hours,
          detected_deviation, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending')
        RETURNING *`,
                [
                    data.spec_id,
                    data.email_id,
                    data.client_id,
                    data.result.severity,
                    data.result.category,
                    data.result.clientQuote,
                    data.result.reasoning, // Using reasoning as summary for now
                    data.result.reasoning,
                    data.result.estimatedHours,
                    data.result.detectedDeviation
                ]
            );

            logger.info(`Created scope creep alert for spec ${data.spec_id}`);
            return result.rows[0];
        } catch (error) {
            logger.error('Error creating scope creep alert:', error);
            throw error;
        }
    }

    /**
     * Get alerts for a spec
     */
    async getAlertsBySpec(specId: string) {
        const result = await db.query(
            `SELECT * FROM scope_creep_alerts WHERE spec_id = $1 ORDER BY created_at DESC`,
            [specId]
        );
        return result.rows;
    }

    /**
     * Resolve an alert
     */
    async resolveAlert(alertId: string, resolutionType: string) {
        // If user wants to update the spec, actually update it before resolving
        if (resolutionType === 'spec_updated') {
            await this.updateSpecFromAlert(alertId);
        }

        const result = await db.query(
            `UPDATE scope_creep_alerts
       SET status = 'resolved', resolution_type = $1, resolved_at = NOW()
       WHERE id = $2 RETURNING *`,
            [resolutionType, alertId]
        );
        return result.rows[0];
    }

    /**
     * Update the spec with the detected deviation from an alert
     */
    private async updateSpecFromAlert(alertId: string) {
        try {
            // Get alert details
            const alertResult = await db.query(
                `SELECT * FROM scope_creep_alerts WHERE id = $1`,
                [alertId]
            );

            if (alertResult.rows.length === 0) {
                throw new Error('Alert not found');
            }

            const alert = alertResult.rows[0];
            const { spec_id, category, detected_deviation, client_quote } = alert;

            // Get current spec content
            const { spec, content } = await specService.getSpec(spec_id);

            // Parse detected_deviation if it's a string
            const deviation = typeof detected_deviation === 'string'
                ? JSON.parse(detected_deviation)
                : detected_deviation;

            // Update content based on category
            const updatedContent = this.mergeDeviationIntoSpec(content, category, deviation, client_quote);

            // Create new spec version
            await specService.updateSpec(
                spec_id,
                spec.user_id,
                {
                    content: updatedContent,
                    change_summary: `Updated spec to include: ${deviation.description}`,
                    change_reason: `Scope change accepted from client request`
                }
            );

            logger.info(`Updated spec ${spec_id} from alert ${alertId}`);
        } catch (error) {
            logger.error('Error updating spec from alert:', error);
            throw error;
        }
    }

    /**
     * Merge detected deviation into spec content
     */
    private mergeDeviationIntoSpec(
        content: SpecContent,
        category: string,
        deviation: any,
        clientQuote: string
    ): SpecContent {
        const updatedContent = { ...content };

        // Create a new spec item
        const newItem: SpecItem = {
            id: uuidv4(),
            description: deviation.description,
            status: 'pending'
        };

        switch (category) {
            case 'new_deliverable':
                // Add to deliverables
                updatedContent.deliverables = [...(updatedContent.deliverables || []), newItem];
                break;

            case 'spec_expansion':
                // Add to specifications
                updatedContent.specifications = [...(updatedContent.specifications || []), newItem];
                break;

            case 'exclusion_violation':
                // Remove from exclusions if it exists there, and add to deliverables
                if (updatedContent.exclusions) {
                    updatedContent.exclusions = updatedContent.exclusions.filter(
                        item => !item.description.toLowerCase().includes(deviation.description.toLowerCase())
                    );
                }
                updatedContent.deliverables = [...(updatedContent.deliverables || []), newItem];
                break;

            case 'timeline_change':
                // Add a note about timeline change
                const timelineNote = `Timeline change: ${deviation.description} (Client: "${clientQuote}")`;
                updatedContent.notes = [...(updatedContent.notes || []), timelineNote];
                break;

            case 'assumed_inclusion':
            case 'revision_abuse':
            case 'other':
            default:
                // Add to notes for anything else
                const note = `${deviation.type || 'Scope change'}: ${deviation.description} (Client: "${clientQuote}")`;
                updatedContent.notes = [...(updatedContent.notes || []), note];
                break;
        }

        return updatedContent;
    }

    /**
     * Generate email response for a scope creep alert
     */
    async generateResponseForAlert(
        alertId: string,
        tone: 'friendly' | 'professional' | 'firm'
    ): Promise<string> {
        try {
            // Get alert details with client and project info
            const result = await db.query(
                `SELECT
                    a.*,
                    c.name as client_name,
                    c.email as client_email,
                    s.project_name
                FROM scope_creep_alerts a
                JOIN clients c ON a.client_id = c.id
                JOIN project_specs s ON a.spec_id = s.id
                WHERE a.id = $1`,
                [alertId]
            );

            if (result.rows.length === 0) {
                throw new Error('Alert not found');
            }

            const alert = result.rows[0];
            const clientName = alert.client_name || alert.client_email || 'there';
            const projectName = alert.project_name || 'your project';

            logger.info(`Generating ${tone} response for alert ${alertId}`, {
                clientName,
                projectName,
                severity: alert.severity,
            });

            // Generate response using AI service
            const response = await aiService.generateScopeCreepResponse(
                alert,
                tone,
                clientName,
                projectName
            );

            return response;
        } catch (error) {
            logger.error('Error generating alert response:', error);
            throw error;
        }
    }
}

export default new ScopeCreepService();
