import db from '../config/database';
import logger from '../config/logger';
import { ScopeCreepResult } from '../types/ai.types';

export interface CreateScopeCreepAlertDTO {
    spec_id: string;
    email_id: string;
    client_id: string;
    result: ScopeCreepResult;
}

class ScopeCreepService {
    /**
     * Create a new scope creep alert
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
        const result = await db.query(
            `UPDATE scope_creep_alerts 
       SET status = 'resolved', resolution_type = $1, resolved_at = NOW() 
       WHERE id = $2 RETURNING *`,
            [resolutionType, alertId]
        );
        return result.rows[0];
    }
}

export default new ScopeCreepService();
