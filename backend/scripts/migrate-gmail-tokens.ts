import { getClient } from '../src/config/database';
import logger from '../src/config/logger';

const GMAIL_TOKENS_MIGRATION = `
CREATE TABLE IF NOT EXISTS gmail_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    expires_at TIMESTAMP NOT NULL,
    email VARCHAR(255) NOT NULL,
    scopes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_gmail_tokens_user_id ON gmail_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_gmail_tokens_email ON gmail_tokens(email);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'update_gmail_tokens_updated_at'
    ) THEN
        CREATE TRIGGER update_gmail_tokens_updated_at
        BEFORE UPDATE ON gmail_tokens
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;
`;

async function runMigration() {
  const client = await getClient();

  try {
    logger.info('Starting Gmail tokens table migration...');

    await client.query(GMAIL_TOKENS_MIGRATION);

    logger.info('✅ Gmail tokens table created successfully!');

    // Verify the table was created
    const result = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'gmail_tokens'
    `);

    if (result.rows.length > 0) {
      logger.info('✅ Verified: gmail_tokens table exists in database');
    } else {
      logger.error('❌ Table verification failed');
    }

    process.exit(0);
  } catch (error) {
    logger.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
  }
}

runMigration();
