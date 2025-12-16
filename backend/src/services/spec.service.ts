import db from '../config/database';
import logger from '../config/logger';
import { ProjectSpec, SpecVersion, CreateSpecDTO, UpdateSpecDTO, SpecContent } from '../types/spec.types';
import trelloService from './trello.service';
import { v4 as uuidv4 } from 'uuid';

class SpecService {
    /**
     * Create a new project spec (Draft)
     */
    async createSpec(data: CreateSpecDTO): Promise<{ spec: ProjectSpec; version: SpecVersion }> {
        const client = await db.connect();
        try {
            await client.query('BEGIN');

            // 1. Create Spec Record
            const specResult = await client.query(
                `INSERT INTO project_specs (
          user_id, client_id, project_name, current_version, status
        ) VALUES ($1, $2, $3, 1, 'draft')
        RETURNING *`,
                [data.user_id, data.client_id, data.project_name]
            );
            const spec = specResult.rows[0];

            // 2. Create Initial Version
            const versionResult = await client.query(
                `INSERT INTO spec_versions (
          spec_id, version_number, content, change_summary, created_by
        ) VALUES ($1, 1, $2, 'Initial draft generated', 'system')
        RETURNING *`,
                [spec.id, data.initial_content]
            );
            const version = versionResult.rows[0];

            await client.query('COMMIT');
            logger.info(`Created spec ${spec.id} for project ${data.project_name}`);
            return { spec, version };
        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('Error creating spec:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Get a spec by ID (returns current version content)
     */
    async getSpec(specId: string): Promise<{ spec: ProjectSpec; content: SpecContent }> {
        const specResult = await db.query(`SELECT * FROM project_specs WHERE id = $1`, [specId]);
        if (specResult.rows.length === 0) throw new Error('Spec not found');
        const spec = specResult.rows[0];

        const versionResult = await db.query(
            `SELECT content FROM spec_versions WHERE spec_id = $1 AND version_number = $2`,
            [specId, spec.current_version]
        );

        return { spec, content: versionResult.rows[0].content };
    }

    /**
     * Update a spec (Always creates a new version for full audit trail)
     */
    async updateSpec(specId: string, userId: string, data: UpdateSpecDTO): Promise<SpecVersion> {
        const client = await db.connect();
        try {
            await client.query('BEGIN');

            // Get current spec status
            const specResult = await client.query(`SELECT * FROM project_specs WHERE id = $1`, [specId]);
            if (specResult.rows.length === 0) throw new Error('Spec not found');
            const spec = specResult.rows[0];

            // Always create NEW version for full audit trail and undo capability
            const newVersionNumber = spec.current_version + 1;

            await client.query(
                `INSERT INTO spec_versions (
                    spec_id, version_number, content, change_summary, change_reason, created_by
                ) VALUES ($1, $2, $3, $4, $5, 'user')`,
                [specId, newVersionNumber, data.content, data.change_summary, data.change_reason]
            );

            // Update spec pointer
            await client.query(
                `UPDATE project_specs SET current_version = $1, updated_at = NOW() WHERE id = $2`,
                [newVersionNumber, specId]
            );

            await client.query('COMMIT');

            const versionResult = await db.query(
                `SELECT * FROM spec_versions WHERE spec_id = $1 AND version_number = $2`,
                [specId, newVersionNumber]
            );

            return versionResult.rows[0];
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Lock a spec (Baseline)
     */
    /**
     * Lock a spec (Baseline) and sync with Trello
     */
    async lockSpec(specId: string): Promise<ProjectSpec> {
        const client = await db.connect();
        try {
            await client.query('BEGIN');

            // 1. Lock the spec
            const result = await client.query(
                `UPDATE project_specs SET status = 'locked', locked_at = NOW() WHERE id = $1 RETURNING *`,
                [specId]
            );
            const spec = result.rows[0];

            await client.query('COMMIT');
            return spec;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Sync a locked spec to Trello
     */
    async syncToTrello(specId: string): Promise<void> {
        const client = await db.connect();
        try {
            const specResult = await client.query(`SELECT * FROM project_specs WHERE id = $1`, [specId]);
            if (specResult.rows.length === 0) throw new Error('Spec not found');
            const spec = specResult.rows[0];

            if (spec.status !== 'locked') {
                throw new Error('Spec must be locked before syncing to Trello');
            }

            // Try to find linked card via multiple methods
            let cardId = spec.trello_card_id;

            if (!cardId) {
                // Method 1: Try to find from linked pending task
                const taskResult = await client.query(
                    `SELECT trello_card_id FROM pending_tasks WHERE spec_id = $1 AND trello_card_id IS NOT NULL LIMIT 1`,
                    [specId]
                );
                if (taskResult.rows.length > 0) {
                    cardId = taskResult.rows[0].trello_card_id;
                    logger.info(`Found Trello card ${cardId} via linked pending task`);

                    // Store it on the spec for future use
                    await client.query(
                        `UPDATE project_specs SET trello_card_id = $1 WHERE id = $2`,
                        [cardId, specId]
                    );
                }
            }

            if (!cardId) {
                // Method 2: Try to find from emails (legacy fallback)
                const emailResult = await client.query(
                    `SELECT trello_card_id FROM emails WHERE client_id = $1 AND trello_card_id IS NOT NULL ORDER BY received_at DESC LIMIT 1`,
                    [spec.client_id]
                );
                if (emailResult.rows.length > 0) {
                    cardId = emailResult.rows[0].trello_card_id;
                    logger.info(`Found Trello card ${cardId} via client emails (legacy)`);
                }
            }

            if (cardId) {
                // Find or create "Spec Locked" label
                // We need the board ID for this. If we don't have it, we might need to fetch the card first.
                // For now, let's assume we can add a label by name if the service supports it, 
                // or we just add a comment. Adding a label is safer via ID.

                // Let's add a comment for now as it's safer without board ID
                await trelloService.addComment(spec.user_id, cardId, "🔒 **Project Specification Locked**\n\nThe spec has been approved and locked. Any further changes will be tracked as scope creep.");
                logger.info(`Added lock comment to Trello card ${cardId}`);
            } else {
                logger.warn(`No Trello card found for spec ${specId}, skipping sync`);
                throw new Error('No linked Trello card found');
            }
        } catch (error) {
            logger.error('Error syncing spec to Trello:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Get version history
     */
    async getVersionHistory(specId: string): Promise<SpecVersion[]> {
        const result = await db.query(
            `SELECT * FROM spec_versions WHERE spec_id = $1 ORDER BY version_number DESC`,
            [specId]
        );
        return result.rows;
    }
    /**
     * List all specs for a user
     */
    async listSpecs(userId: string): Promise<ProjectSpec[]> {
        const result = await db.query(
            `SELECT * FROM project_specs WHERE user_id = $1 ORDER BY updated_at DESC`,
            [userId]
        );
        return result.rows;
    }
}

export default new SpecService();
