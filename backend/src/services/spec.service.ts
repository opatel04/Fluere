import db from '../config/database';
import logger from '../config/logger';
import { ProjectSpec, SpecVersion, CreateSpecDTO, UpdateSpecDTO, SpecContent } from '../types/spec.types';
import trelloService from './trello.service';

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

            // Get the spec content for card creation
            const versionResult = await client.query(
                `SELECT content FROM spec_versions WHERE spec_id = $1 AND version_number = $2`,
                [specId, spec.current_version]
            );
            const content = versionResult.rows[0]?.content;

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

            // If still no card found, create a new one
            if (!cardId) {
                logger.info(`No existing Trello card found for spec ${specId}, creating new card`);

                // Get user's boards
                const boards = await trelloService.getBoards(spec.user_id);
                if (boards.length === 0) {
                    throw new Error('No Trello boards found. Please create a board first.');
                }

                // Use the first board (or you could add logic to select a specific board)
                const board = boards[0];
                logger.info(`Using Trello board: ${board.name} (${board.id})`);

                // Get or create "Specs" list
                const lists = await trelloService.getLists(spec.user_id, board.id);
                let targetList = lists.find(list => list.name.toLowerCase() === 'specs' || list.name.toLowerCase() === 'specifications');

                // If no "Specs" list, use the first list
                if (!targetList && lists.length > 0) {
                    targetList = lists[0];
                    logger.info(`No 'Specs' list found, using list: ${targetList.name}`);
                }

                if (!targetList) {
                    throw new Error('No lists found on the Trello board. Please create a list first.');
                }

                // Create card description from spec content
                const description = this.formatSpecForTrelloCard(content);

                // Prepare due date if available
                const dueDate = content.timeline?.delivery_date
                    ? new Date(content.timeline.delivery_date).toISOString()
                    : undefined;

                // Create the card with due date
                const newCard = await trelloService.createCard(spec.user_id, {
                    name: `📋 ${spec.project_name} - Specification`,
                    desc: description,
                    idList: targetList.id,
                    pos: 'top',
                    due: dueDate
                });

                cardId = newCard.id;

                // Add checklists for deliverables and specifications
                if (content.deliverables && content.deliverables.length > 0) {
                    const deliverablesChecklist = await trelloService.createChecklist(
                        spec.user_id,
                        cardId,
                        '✅ Deliverables'
                    );

                    const deliverableItems = content.deliverables.map((d: any) => ({
                        name: d.description,
                        checked: false
                    }));

                    await trelloService.addChecklistItems(
                        spec.user_id,
                        deliverablesChecklist.id,
                        deliverableItems
                    );
                    logger.info(`Added ${deliverableItems.length} deliverables to checklist`);
                }

                if (content.specifications && content.specifications.length > 0) {
                    const specsChecklist = await trelloService.createChecklist(
                        spec.user_id,
                        cardId,
                        '⚙️ Technical Specifications'
                    );

                    const specItems = content.specifications.map((s: any) => ({
                        name: s.description,
                        checked: false
                    }));

                    await trelloService.addChecklistItems(
                        spec.user_id,
                        specsChecklist.id,
                        specItems
                    );
                    logger.info(`Added ${specItems.length} specifications to checklist`);
                }

                // Save card ID to spec
                await client.query(
                    `UPDATE project_specs SET trello_card_id = $1, trello_board_id = $2 WHERE id = $3`,
                    [cardId, board.id, specId]
                );

                logger.info(`Created new Trello card ${cardId} for spec ${specId} with checklists`);
            }

            // Add lock comment to the card
            await trelloService.addComment(
                spec.user_id,
                cardId,
                "🔒 **Project Specification Locked**\n\nThe spec has been approved and locked. Any further changes will be tracked as scope creep."
            );
            logger.info(`Added lock comment to Trello card ${cardId}`);
        } catch (error) {
            logger.error('Error syncing spec to Trello:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Format spec content for Trello card description
     */
    private formatSpecForTrelloCard(content: any): string {
        if (!content) return 'Project Specification';

        let description = '## Project Specification\n\n';

        // Deliverables
        if (content.deliverables && content.deliverables.length > 0) {
            description += '### Deliverables\n';
            content.deliverables.forEach((item: any) => {
                description += `- ${item.description}\n`;
            });
            description += '\n';
        }

        // Technical Specs
        if (content.specifications && content.specifications.length > 0) {
            description += '### Technical Specifications\n';
            content.specifications.forEach((item: any) => {
                description += `- ${item.description}\n`;
            });
            description += '\n';
        }

        // Timeline
        if (content.timeline) {
            description += '### Timeline\n';
            if (content.timeline.start_date) description += `- Start: ${content.timeline.start_date}\n`;
            if (content.timeline.delivery_date) description += `- Delivery: ${content.timeline.delivery_date}\n`;
            description += '\n';
        }

        // Budget
        if (content.budget?.total) {
            description += `### Budget\n${content.budget.total}\n\n`;
        }

        // Exclusions
        if (content.exclusions && content.exclusions.length > 0) {
            description += '### ❌ Exclusions\n';
            content.exclusions.forEach((item: any) => {
                const text = typeof item === 'string' ? item : item.description;
                description += `- ${text}\n`;
            });
        }

        return description;
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

    /**
     * Compare two spec versions side-by-side
     * Returns detailed diff showing additions, deletions, and modifications
     */
    async compareVersions(specId: string, version1: number, version2: number) {
        try {
            // Validate versions exist
            const versionsResult = await db.query(
                `SELECT version_number, content, created_at, change_summary, created_by
                 FROM spec_versions
                 WHERE spec_id = $1 AND version_number IN ($2, $3)
                 ORDER BY version_number ASC`,
                [specId, version1, version2]
            );

            if (versionsResult.rows.length !== 2) {
                throw new Error('One or both versions not found');
            }

            const [v1Data, v2Data] = version1 < version2
                ? versionsResult.rows
                : [versionsResult.rows[1], versionsResult.rows[0]];

            const v1Content = v1Data.content as SpecContent;
            const v2Content = v2Data.content as SpecContent;

            // Debug logging for notes field
            console.log('v1Content.notes type:', typeof v1Content.notes);
            console.log('v1Content.notes value:', v1Content.notes);
            console.log('v1Content.notes isArray:', Array.isArray(v1Content.notes));
            console.log('v2Content.notes type:', typeof v2Content.notes);
            console.log('v2Content.notes value:', v2Content.notes);
            console.log('v2Content.notes isArray:', Array.isArray(v2Content.notes));

            // Build comprehensive diff
            const diff = {
                metadata: {
                    specId,
                    version1: {
                        number: v1Data.version_number,
                        createdAt: v1Data.created_at,
                        createdBy: v1Data.created_by,
                        changeSummary: v1Data.change_summary
                    },
                    version2: {
                        number: v2Data.version_number,
                        createdAt: v2Data.created_at,
                        createdBy: v2Data.created_by,
                        changeSummary: v2Data.change_summary
                    }
                },
                changes: {
                    deliverables: this.compareArrayField(v1Content.deliverables, v2Content.deliverables),
                    specifications: this.compareArrayField(v1Content.specifications, v2Content.specifications),
                    exclusions: this.compareArrayField(v1Content.exclusions, v2Content.exclusions),
                    timeline: this.compareObjectField(v1Content.timeline, v2Content.timeline),
                    budget: this.compareObjectField(v1Content.budget, v2Content.budget),
                    notes: this.compareArrayField(v1Content.notes, v2Content.notes)
                },
                summary: {
                    totalChanges: 0,
                    addedItems: 0,
                    removedItems: 0,
                    modifiedItems: 0
                }
            };

            // Calculate summary statistics
            for (const field of Object.values(diff.changes)) {
                if (field && typeof field === 'object' && 'changeType' in field) {
                    if (field.changeType !== 'unchanged') {
                        diff.summary.totalChanges++;
                    }
                    // Check for array-type fields (deliverables, specifications, etc.)
                    if ('added' in field && Array.isArray(field.added)) {
                        diff.summary.addedItems += field.added.length;
                    }
                    if ('removed' in field && Array.isArray(field.removed)) {
                        diff.summary.removedItems += field.removed.length;
                    }
                    if ('modified' in field && Array.isArray(field.modified)) {
                        diff.summary.modifiedItems += field.modified.length;
                    }
                    // Check for object-type fields (timeline, budget)
                    if (field.changeType === 'added' && !('added' in field)) {
                        diff.summary.addedItems++;
                    }
                    if (field.changeType === 'removed' && !('removed' in field)) {
                        diff.summary.removedItems++;
                    }
                }
            }

            logger.info(`Compared versions ${version1} and ${version2} for spec ${specId}`);
            return diff;
        } catch (error) {
            logger.error('Error comparing spec versions:', error);
            throw error;
        }
    }

    /**
     * Compare array fields (deliverables, specifications, exclusions, notes)
     */
    private compareArrayField(oldArray: any[] = [], newArray: any[] = []) {
        // Ensure we have arrays to work with (and handle all edge cases)
        let oldArr: any[] = [];
        let newArr: any[] = [];

        // Helper to normalize any value to an array
        const normalizeToArray = (value: any): any[] => {
            // If null or undefined, return empty array
            if (value === null || value === undefined) {
                return [];
            }

            // If already an array, check if it's an array of single characters
            if (Array.isArray(value)) {
                // If it's an array of single-character strings, it was likely
                // incorrectly stored by spreading a string. Join them back together.

                // Check if all items are single-character strings
                const nonMatchingItems = value.filter((item: any, idx: number) => {
                    const isMatch = typeof item === 'string' && item.length === 1;
                    return !isMatch;
                });

                const isCharArray = value.length > 0 && nonMatchingItems.length === 0;

                console.log('Array check:', {
                    length: value.length,
                    firstItem: value[0],
                    firstItemType: typeof value[0],
                    firstItemLength: typeof value[0] === 'string' ? value[0].length : 'N/A',
                    nonMatchingCount: nonMatchingItems.length,
                    nonMatchingSample: nonMatchingItems.slice(0, 3),
                    isCharArray
                });

                if (isCharArray) {
                    console.log('Detected character array, joining back to string');
                    return [value.join('')];
                }
                return value;
            }

            // If it's a string, wrap it in an array (don't spread it!)
            if (typeof value === 'string') {
                return value ? [value] : [];
            }

            // For any other type, wrap in array
            return [value];
        };

        oldArr = normalizeToArray(oldArray);
        newArr = normalizeToArray(newArray);

        console.log('After normalization:');
        console.log('oldArr:', oldArr);
        console.log('newArr:', newArr);

        const added: any[] = [];
        const removed: any[] = [];
        const modified: any[] = [];
        const unchanged: any[] = [];

        // Create maps for efficient lookup
        const oldMap = new Map();
        const newMap = new Map();

        // Generate a stable key for any item type
        const getItemKey = (item: any): string => {
            if (typeof item === 'string') return item;
            if (item.id) return item.id;
            if (item.description) return item.description;
            // For complex objects, use JSON string as key
            return JSON.stringify(item);
        };

        // Handle arrays of objects with IDs or strings
        oldArr.forEach(item => {
            const key = getItemKey(item);
            oldMap.set(key, item);
        });

        newArr.forEach(item => {
            const key = getItemKey(item);
            newMap.set(key, item);
        });

        // Find removed items
        oldMap.forEach((item, key) => {
            if (!newMap.has(key)) {
                removed.push(item);
            }
        });

        // Find added and modified items
        newMap.forEach((newItem, key) => {
            if (!oldMap.has(key)) {
                added.push(newItem);
            } else {
                const oldItem = oldMap.get(key);
                // Check if item was modified (for objects, compare status or other fields)
                if (typeof newItem === 'object' && typeof oldItem === 'object') {
                    const isModified = JSON.stringify(oldItem) !== JSON.stringify(newItem);
                    if (isModified) {
                        modified.push({ old: oldItem, new: newItem });
                    } else {
                        unchanged.push(newItem);
                    }
                } else {
                    unchanged.push(newItem);
                }
            }
        });

        const hasChanges = added.length > 0 || removed.length > 0 || modified.length > 0;

        return {
            changeType: hasChanges ? 'modified' : 'unchanged',
            added,
            removed,
            modified,
            unchanged,
            oldCount: oldArr.length,
            newCount: newArr.length
        };
    }

    /**
     * Compare object fields (timeline, budget)
     */
    private compareObjectField(oldObj: any = {}, newObj: any = {}) {
        if (!oldObj && !newObj) {
            return { changeType: 'unchanged', changes: {} };
        }

        if (!oldObj) {
            return { changeType: 'added', old: null, new: newObj };
        }

        if (!newObj) {
            return { changeType: 'removed', old: oldObj, new: null };
        }

        const changes: any = {};
        const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);

        allKeys.forEach(key => {
            const oldValue = oldObj[key];
            const newValue = newObj[key];

            if (oldValue !== newValue) {
                changes[key] = { old: oldValue, new: newValue };
            }
        });

        const hasChanges = Object.keys(changes).length > 0;

        return {
            changeType: hasChanges ? 'modified' : 'unchanged',
            changes,
            old: oldObj,
            new: newObj
        };
    }
}

export default new SpecService();
