-- Board Automation Configuration Tables
-- Migration: 002_board_automation

-- Board configurations table
-- Stores user's board automation settings
CREATE TABLE IF NOT EXISTS board_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    board_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, board_id)
);

CREATE INDEX idx_board_configs_user_id ON board_configs(user_id);
CREATE INDEX idx_board_configs_board_id ON board_configs(board_id);

-- Board lists configuration table
-- Defines which lists should exist on a board
CREATE TABLE IF NOT EXISTS board_lists_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    board_config_id UUID REFERENCES board_configs(id) ON DELETE CASCADE,
    list_name VARCHAR(255) NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    auto_create BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(board_config_id, list_name)
);

CREATE INDEX idx_board_lists_config_board_config_id ON board_lists_config(board_config_id);

-- Board routing rules table
-- Defines conditions for routing cards to specific lists
CREATE TABLE IF NOT EXISTS board_routing_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    board_config_id UUID REFERENCES board_configs(id) ON DELETE CASCADE,
    rule_name VARCHAR(255) NOT NULL,
    condition JSONB NOT NULL,
    target_list VARCHAR(255) NOT NULL,
    priority INTEGER DEFAULT 0,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_board_routing_rules_board_config_id ON board_routing_rules(board_config_id);
CREATE INDEX idx_board_routing_rules_priority ON board_routing_rules(priority);
CREATE INDEX idx_board_routing_rules_enabled ON board_routing_rules(enabled);

-- Add triggers for updated_at
CREATE TRIGGER update_board_configs_updated_at BEFORE UPDATE ON board_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_board_routing_rules_updated_at BEFORE UPDATE ON board_routing_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add missing columns to existing tables (if they don't exist)
DO $$
BEGIN
    -- Add auto_process_enabled column to user_preferences if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='user_preferences' AND column_name='auto_process_enabled') THEN
        ALTER TABLE user_preferences ADD COLUMN auto_process_enabled BOOLEAN DEFAULT false;
    END IF;

    -- Add columns to emails table if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='emails' AND column_name='message_id') THEN
        ALTER TABLE emails ADD COLUMN message_id VARCHAR(255);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='emails' AND column_name='tasks_count') THEN
        ALTER TABLE emails ADD COLUMN tasks_count INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='emails' AND column_name='processing_confidence') THEN
        ALTER TABLE emails ADD COLUMN processing_confidence FLOAT;
    END IF;
END $$;

-- Add unique constraint on message_id if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'emails_user_message_unique') THEN
        ALTER TABLE emails ADD CONSTRAINT emails_user_message_unique UNIQUE (user_id, message_id);
    END IF;
EXCEPTION
    WHEN others THEN
        -- Constraint may already exist, continue
        NULL;
END $$;

-- Add missing tables for Trello tokens and Gmail watches
CREATE TABLE IF NOT EXISTS trello_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    token TEXT NOT NULL,
    username VARCHAR(255),
    full_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_trello_tokens_user_id ON trello_tokens(user_id);

CREATE TABLE IF NOT EXISTS gmail_watches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    expiration TIMESTAMP NOT NULL,
    history_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_gmail_watches_user_id ON gmail_watches(user_id);
CREATE INDEX idx_gmail_watches_expiration ON gmail_watches(expiration);
