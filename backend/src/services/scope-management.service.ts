import db from '../config/database';
import logger from '../config/logger';



import aiService from './ai.service';
import specService from './spec.service';
import gmailService from './gmail.service';
import ClientService from './client.service';
import { ProjectSpec, SpecVersion, SpecContent } from '../types/spec.types';

class ScopeManagementService {
    private clientService: ClientService;

    constructor() {
        this.clientService = new ClientService();
    }

    /**
     * Generate a draft spec from an email
     */
    async generateSpecFromEmail(userId: string, emailId: string): Promise<{ spec: ProjectSpec; version: SpecVersion }> {
        try {
            // 1. Fetch Email
            const emailMessage = await gmailService.getEmailById(userId, emailId);
            if (!emailMessage) throw new Error('Email not found');

            const email = gmailService.parseEmail(emailMessage);
            const emailContent = `Subject: ${email.subject}\nFrom: ${email.from}\nDate: ${email.date}\n\n${email.body}`;

            // 2. AI Generation
            const specContent = await aiService.generateProjectSpec(emailContent);

            // 3. Find/Create Client
            const { email: senderEmail, name: senderName } = this.extractEmailAndName(email.from);
            const clientId = await this.clientService.findOrCreateClient(userId, senderEmail, senderName || 'Unknown Client');

            // 4. Create Spec
            const result = await specService.createSpec({
                user_id: userId,
                client_id: clientId,
                project_name: specContent.project_name || email.subject || 'Untitled Project',
                initial_content: specContent,
                source_email_id: emailId
            });

            // 5. Link pending task to spec (if exists)
            try {
                await db.query(
                    'UPDATE pending_tasks SET spec_id = $1 WHERE email_id = $2 AND user_id = $3',
                    [result.spec.id, emailId, userId]
                );
                logger.info(`Linked pending task to spec ${result.spec.id}`);
            } catch (linkError) {
                logger.warn('Failed to link pending task to spec:', linkError);
                // Non-critical error, don't throw
            }

            return result;
        } catch (error) {
            logger.error('Error generating spec from email:', error);
            throw error;
        }
    }

    /**
     * Helper to extract email and name
     */
    private extractEmailAndName(fromHeader: string): { email: string; name?: string } {
        const match = fromHeader.match(/(.*)<(.+)>/);
        if (match) {
            return { name: match[1].trim().replace(/^"|"$/g, ''), email: match[2].trim() };
        }
        return { email: fromHeader.trim() };
    }

    /**
     * Process a chat message to edit a spec
     */
    async processChatEdit(userId: string, specId: string, message: string): Promise<{ spec: ProjectSpec; content: SpecContent; reply: string }> {
        try {
            // 1. Get current spec
            const { spec, content } = await specService.getSpec(specId);

            // Verify ownership
            if (spec.user_id !== userId) {
                throw new Error('Unauthorized access to spec');
            }

            if (spec.status === 'locked') {
                throw new Error('Cannot edit a locked spec');
            }

            // 2. AI Modification
            const result = await aiService.modifyProjectSpec(content, message);

            // 3. Update Spec (creates new version)
            const updatedVersion = await specService.updateSpec(specId, userId, {
                content: result.content,
                change_summary: `AI Edit: ${message}`
            });

            // 4. Fetch updated spec metadata
            const { spec: updatedSpec } = await specService.getSpec(specId);

            return {
                spec: updatedSpec,
                content: updatedVersion.content,
                reply: result.reply
            };
        } catch (error) {
            logger.error('Error processing chat edit:', error);
            throw error;
        }
    }
}

export default new ScopeManagementService();
