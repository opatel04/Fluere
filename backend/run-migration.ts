import fs from 'fs';
import path from 'path';
import { query, closePool } from './src/config/database';
import logger from './src/config/logger';

async function runMigration() {
    try {
        // Check if file exists in src/migrations or just migrations
        let sql;

        if (fs.existsSync(path.join(__dirname, 'migrations/004_add_spec_id_to_pending_tasks.sql'))) {
            sql = fs.readFileSync(path.join(__dirname, 'migrations/004_add_spec_id_to_pending_tasks.sql'), 'utf8');
        } else if (fs.existsSync(path.join(__dirname, 'src/migrations/004_add_spec_id_to_pending_tasks.sql'))) {
            sql = fs.readFileSync(path.join(__dirname, 'src/migrations/004_add_spec_id_to_pending_tasks.sql'), 'utf8');
        } else {
            // Try absolute path based on previous knowledge
            sql = fs.readFileSync('/Users/ompatel/fluere_v1_testing/backend/migrations/004_add_spec_id_to_pending_tasks.sql', 'utf8');
        }

        logger.info('Running migration: 004_add_spec_id_to_pending_tasks.sql');
        await query(sql);
        logger.info('Migration completed successfully');
    } catch (error) {
        logger.error('Migration failed:', error);
    } finally {
        await closePool();
    }
}

runMigration();
