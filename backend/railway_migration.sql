-- TaskSnap Complete Database Migration for Railway
-- Combined from schema.sql + all migrations
-- Run this once on your Railway PostgreSQL database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- BASE SCHEMA (from schema.sql)
-- =====================================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    gmail_token TEXT,
    gmail_refresh_token TEXT,
    gmail_token_expiry TIMESTAMP,
    trello_token TEXT,
    trello_token_secret TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- User preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    organization_style VARCHAR(50) DEFAULT 'priority',
    board_strategy VARCHAR(50) DEFAULT 'single',
    default_grouping VARCHAR(50) DEFAULT 'priority',
    auto_process_emails BOOLEAN DEFAULT false,
    notification_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Emails table
CREATE TABLE IF NOT EXISTS emails (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    gmail_id VARCHAR(255) NOT NULL,
    thread_id VARCHAR(255),
    subject TEXT,
    body TEXT,
    sender VARCHAR(255),
    sender_email VARCHAR(255),
    recipients TEXT,
    received_at TIMESTAMP,
    processed_at TIMESTAMP,
    processing_status VARCHAR(50) DEFAULT 'pending',
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, gmail_id)
);

CREATE INDEX IF NOT EXISTS idx_emails_user_id ON emails(user_id);
CREATE INDEX IF NOT EXISTS idx_emails_processing_status ON emails(processing_status);
CREATE INDEX IF NOT EXISTS idx_emails_processed_at ON emails(processed_at);

-- Email tasks table
CREATE TABLE IF NOT EXISTS email_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email_id UUID REFERENCES emails(id) ON DELETE CASCADE,
    task_text TEXT NOT NULL,
    priority_score INTEGER DEFAULT 0,
    priority_level VARCHAR(20) DEFAULT 'medium',
    confidence_score FLOAT DEFAULT 0.0,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_email_tasks_email_id ON email_tasks(email_id);
CREATE INDEX IF NOT EXISTS idx_email_tasks_status ON email_tasks(status);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    source_type VARCHAR(50) NOT NULL,
    source_id UUID,
    content TEXT NOT NULL,
    title VARCHAR(500),
    description TEXT,
    priority VARCHAR(20) DEFAULT 'medium',
    priority_score INTEGER DEFAULT 50,
    category VARCHAR(100),
    assigned_to VARCHAR(255),
    department VARCHAR(100),
    status VARCHAR(50) DEFAULT 'pending',
    due_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_source_type ON tasks(source_type);

-- Task routing rules table
CREATE TABLE IF NOT EXISTS task_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    rule_name VARCHAR(255) NOT NULL,
    rule_type VARCHAR(50) NOT NULL,
    pattern TEXT NOT NULL,
    target_board_id VARCHAR(255),
    target_list_id VARCHAR(255),
    priority_modifier INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_task_rules_user_id ON task_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_task_rules_is_active ON task_rules(is_active);

-- Trello boards table
CREATE TABLE IF NOT EXISTS trello_boards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    board_id VARCHAR(255) NOT NULL,
    board_name VARCHAR(255) NOT NULL,
    board_url TEXT,
    sync_enabled BOOLEAN DEFAULT true,
    webhook_id VARCHAR(255),
    last_synced_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, board_id)
);

CREATE INDEX IF NOT EXISTS idx_trello_boards_user_id ON trello_boards(user_id);
CREATE INDEX IF NOT EXISTS idx_trello_boards_sync_enabled ON trello_boards(sync_enabled);

-- Trello lists table
CREATE TABLE IF NOT EXISTS trello_lists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    board_id UUID REFERENCES trello_boards(id) ON DELETE CASCADE,
    list_id VARCHAR(255) NOT NULL,
    list_name VARCHAR(255) NOT NULL,
    position INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(board_id, list_id)
);

CREATE INDEX IF NOT EXISTS idx_trello_lists_board_id ON trello_lists(board_id);

-- Trello cards table
CREATE TABLE IF NOT EXISTS trello_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    card_id VARCHAR(255) NOT NULL,
    board_id UUID REFERENCES trello_boards(id) ON DELETE CASCADE,
    list_id VARCHAR(255),
    card_name TEXT,
    card_url TEXT,
    synced_at TIMESTAMP,
    last_updated_at TIMESTAMP,
    sync_status VARCHAR(50) DEFAULT 'synced',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(card_id)
);

CREATE INDEX IF NOT EXISTS idx_trello_cards_task_id ON trello_cards(task_id);
CREATE INDEX IF NOT EXISTS idx_trello_cards_board_id ON trello_cards(board_id);
CREATE INDEX IF NOT EXISTS idx_trello_cards_sync_status ON trello_cards(sync_status);

-- AI analysis table
CREATE TABLE IF NOT EXISTS ai_analysis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    analysis_type VARCHAR(50) NOT NULL,
    confidence_score FLOAT NOT NULL,
    extracted_entities JSONB,
    model_version VARCHAR(50),
    tokens_used INTEGER,
    processing_time_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_analysis_task_id ON ai_analysis(task_id);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_type ON ai_analysis(analysis_type);

-- Processing jobs table
CREATE TABLE IF NOT EXISTS processing_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    job_type VARCHAR(50) NOT NULL,
    job_status VARCHAR(50) DEFAULT 'queued',
    job_data JSONB,
    result JSONB,
    error_message TEXT,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_processing_jobs_user_id ON processing_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_status ON processing_jobs(job_status);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_type ON processing_jobs(job_type);

-- =====================================================
-- TRIGGER FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to base tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_emails_updated_at BEFORE UPDATE ON emails
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_tasks_updated_at BEFORE UPDATE ON email_tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_rules_updated_at BEFORE UPDATE ON task_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trello_boards_updated_at BEFORE UPDATE ON trello_boards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trello_lists_updated_at BEFORE UPDATE ON trello_lists
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trello_cards_updated_at BEFORE UPDATE ON trello_cards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_processing_jobs_updated_at BEFORE UPDATE ON processing_jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- MIGRATION 002: Board Automation
-- =====================================================

CREATE TABLE IF NOT EXISTS board_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    board_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, board_id)
);

CREATE INDEX IF NOT EXISTS idx_board_configs_user_id ON board_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_board_configs_board_id ON board_configs(board_id);

CREATE TABLE IF NOT EXISTS board_lists_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    board_config_id UUID REFERENCES board_configs(id) ON DELETE CASCADE,
    list_name VARCHAR(255) NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    auto_create BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(board_config_id, list_name)
);

CREATE INDEX IF NOT EXISTS idx_board_lists_config_board_config_id ON board_lists_config(board_config_id);

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

CREATE INDEX IF NOT EXISTS idx_board_routing_rules_board_config_id ON board_routing_rules(board_config_id);
CREATE INDEX IF NOT EXISTS idx_board_routing_rules_priority ON board_routing_rules(priority);
CREATE INDEX IF NOT EXISTS idx_board_routing_rules_enabled ON board_routing_rules(enabled);

CREATE TRIGGER update_board_configs_updated_at BEFORE UPDATE ON board_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_board_routing_rules_updated_at BEFORE UPDATE ON board_routing_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add columns to existing tables
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='user_preferences' AND column_name='auto_process_enabled') THEN
        ALTER TABLE user_preferences ADD COLUMN auto_process_enabled BOOLEAN DEFAULT false;
    END IF;

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

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'emails_user_message_unique') THEN
        ALTER TABLE emails ADD CONSTRAINT emails_user_message_unique UNIQUE (user_id, message_id);
    END IF;
EXCEPTION
    WHEN others THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS trello_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    token TEXT NOT NULL,
    username VARCHAR(255),
    full_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_trello_tokens_user_id ON trello_tokens(user_id);

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

CREATE TRIGGER update_gmail_tokens_updated_at BEFORE UPDATE ON gmail_tokens
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS gmail_watches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    expiration TIMESTAMP NOT NULL,
    history_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_gmail_watches_user_id ON gmail_watches(user_id);
CREATE INDEX IF NOT EXISTS idx_gmail_watches_expiration ON gmail_watches(expiration);

-- =====================================================
-- MIGRATION 003: Activity Logs
-- =====================================================

CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(255),
    resource_name VARCHAR(500),
    action_status VARCHAR(50) DEFAULT 'success',
    action_details JSONB,
    error_message TEXT,
    ip_address INET,
    user_agent TEXT,
    duration_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_resource_type ON activity_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_status ON activity_logs(action_status);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_timeline ON activity_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_failed ON activity_logs(action_status, created_at DESC) WHERE action_status = 'failed';

CREATE OR REPLACE FUNCTION cleanup_old_activity_logs(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM activity_logs WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- MIGRATION 004: Freelancer Pivot (Clients)
-- =====================================================

CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    company VARCHAR(255),
    phone VARCHAR(50),
    email_count INTEGER DEFAULT 0,
    first_contact_date TIMESTAMP,
    last_contact_date TIMESTAMP,
    status TEXT DEFAULT 'active',
    health_score INTEGER DEFAULT 100,
    health_updated_at TIMESTAMP,
    notes TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, email)
);

CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_health_score ON clients(health_score);
CREATE INDEX IF NOT EXISTS idx_clients_last_contact ON clients(last_contact_date DESC);

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add columns to emails table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='emails' AND column_name='in_reply_to') THEN
        ALTER TABLE emails ADD COLUMN in_reply_to TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='emails' AND column_name='references') THEN
        ALTER TABLE emails ADD COLUMN "references" TEXT[];
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='emails' AND column_name='is_reply') THEN
        ALTER TABLE emails ADD COLUMN is_reply BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='emails' AND column_name='reply_count') THEN
        ALTER TABLE emails ADD COLUMN reply_count INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='emails' AND column_name='sentiment') THEN
        ALTER TABLE emails ADD COLUMN sentiment TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='emails' AND column_name='sentiment_score') THEN
        ALTER TABLE emails ADD COLUMN sentiment_score INTEGER;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='emails' AND column_name='sentiment_reason') THEN
        ALTER TABLE emails ADD COLUMN sentiment_reason TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='emails' AND column_name='client_id') THEN
        ALTER TABLE emails ADD COLUMN client_id UUID REFERENCES clients(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='emails' AND column_name='email_type') THEN
        ALTER TABLE emails ADD COLUMN email_type TEXT DEFAULT 'inbound';
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_emails_client_id ON emails(client_id);
CREATE INDEX IF NOT EXISTS idx_emails_thread_id ON emails(thread_id);
CREATE INDEX IF NOT EXISTS idx_emails_sentiment ON emails(sentiment);

CREATE TABLE IF NOT EXISTS follow_ups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    email_id UUID REFERENCES emails(id) ON DELETE CASCADE,
    thread_id TEXT NOT NULL,
    days_since_client_message INTEGER NOT NULL,
    urgency_score INTEGER DEFAULT 5,
    client_message_snippet TEXT,
    suggested_response TEXT,
    status TEXT DEFAULT 'pending',
    dismissed_reason TEXT,
    responded_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_follow_ups_user_id ON follow_ups(user_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_client_id ON follow_ups(client_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_status ON follow_ups(status);
CREATE INDEX IF NOT EXISTS idx_follow_ups_urgency ON follow_ups(urgency_score DESC);
CREATE INDEX IF NOT EXISTS idx_follow_ups_created_at ON follow_ups(created_at DESC);

CREATE TRIGGER update_follow_ups_updated_at BEFORE UPDATE ON follow_ups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS client_sentiment_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    avg_sentiment_score DECIMAL(3,2),
    positive_count INTEGER DEFAULT 0,
    neutral_count INTEGER DEFAULT 0,
    negative_count INTEGER DEFAULT 0,
    total_emails INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(client_id, date)
);

CREATE INDEX IF NOT EXISTS idx_sentiment_history_client_id ON client_sentiment_history(client_id);
CREATE INDEX IF NOT EXISTS idx_sentiment_history_date ON client_sentiment_history(date DESC);

-- Add user preference columns
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_preferences' AND column_name='follow_up_notifications_enabled') THEN
        ALTER TABLE user_preferences ADD COLUMN follow_up_notifications_enabled BOOLEAN DEFAULT true;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_preferences' AND column_name='follow_up_threshold_days') THEN
        ALTER TABLE user_preferences ADD COLUMN follow_up_threshold_days INTEGER DEFAULT 2;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_preferences' AND column_name='daily_summary_enabled') THEN
        ALTER TABLE user_preferences ADD COLUMN daily_summary_enabled BOOLEAN DEFAULT true;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_preferences' AND column_name='daily_summary_time') THEN
        ALTER TABLE user_preferences ADD COLUMN daily_summary_time TIME DEFAULT '08:00:00';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_preferences' AND column_name='daily_summary_timezone') THEN
        ALTER TABLE user_preferences ADD COLUMN daily_summary_timezone TEXT DEFAULT 'UTC';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_preferences' AND column_name='weekly_report_enabled') THEN
        ALTER TABLE user_preferences ADD COLUMN weekly_report_enabled BOOLEAN DEFAULT true;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_preferences' AND column_name='sentiment_analysis_enabled') THEN
        ALTER TABLE user_preferences ADD COLUMN sentiment_analysis_enabled BOOLEAN DEFAULT true;
    END IF;
END $$;

-- Add task enhancements
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='client_id') THEN
        ALTER TABLE tasks ADD COLUMN client_id UUID REFERENCES clients(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='is_overdue') THEN
        ALTER TABLE tasks ADD COLUMN is_overdue BOOLEAN DEFAULT false;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tasks_client_id ON tasks(client_id);
CREATE INDEX IF NOT EXISTS idx_tasks_is_overdue ON tasks(is_overdue);

CREATE TABLE IF NOT EXISTS daily_summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    summary_date DATE NOT NULL,
    summary_text TEXT NOT NULL,
    summary_data JSONB,
    tasks_due_today INTEGER DEFAULT 0,
    tasks_due_tomorrow INTEGER DEFAULT 0,
    pending_follow_ups INTEGER DEFAULT 0,
    active_clients INTEGER DEFAULT 0,
    email_sent BOOLEAN DEFAULT false,
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, summary_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_summaries_user_id ON daily_summaries(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_summaries_date ON daily_summaries(summary_date DESC);

CREATE TABLE IF NOT EXISTS inbound_emails (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    from_email VARCHAR(255) NOT NULL,
    from_name VARCHAR(255),
    to_email VARCHAR(255) NOT NULL,
    subject TEXT,
    body_text TEXT,
    body_html TEXT,
    message_id TEXT,
    in_reply_to TEXT,
    "references" TEXT[],
    processing_status VARCHAR(50) DEFAULT 'pending',
    processed_at TIMESTAMP,
    error_message TEXT,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    email_id UUID REFERENCES emails(id) ON DELETE SET NULL,
    raw_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_inbound_emails_user_id ON inbound_emails(user_id);
CREATE INDEX IF NOT EXISTS idx_inbound_emails_from_email ON inbound_emails(from_email);
CREATE INDEX IF NOT EXISTS idx_inbound_emails_client_id ON inbound_emails(client_id);
CREATE INDEX IF NOT EXISTS idx_inbound_emails_status ON inbound_emails(processing_status);
CREATE INDEX IF NOT EXISTS idx_inbound_emails_created_at ON inbound_emails(created_at DESC);

CREATE TRIGGER update_inbound_emails_updated_at BEFORE UPDATE ON inbound_emails
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Helper functions
CREATE OR REPLACE FUNCTION update_client_activity()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.client_id IS NOT NULL THEN
        UPDATE clients
        SET email_count = email_count + 1,
            last_contact_date = NEW.received_at,
            first_contact_date = COALESCE(first_contact_date, NEW.received_at),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.client_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_client_activity ON emails;
CREATE TRIGGER trigger_update_client_activity
    AFTER INSERT ON emails
    FOR EACH ROW
    WHEN (NEW.client_id IS NOT NULL)
    EXECUTE FUNCTION update_client_activity();

CREATE OR REPLACE FUNCTION update_overdue_tasks()
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE tasks SET is_overdue = true
    WHERE due_date < NOW() AND status NOT IN ('completed', 'cancelled') AND is_overdue = false;
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_client_stats(p_client_id UUID)
RETURNS TABLE (
    total_tasks INTEGER,
    completed_tasks INTEGER,
    overdue_tasks INTEGER,
    pending_tasks INTEGER,
    total_emails INTEGER,
    avg_sentiment DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(DISTINCT t.id)::INTEGER as total_tasks,
        COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END)::INTEGER as completed_tasks,
        COUNT(DISTINCT CASE WHEN t.is_overdue = true THEN t.id END)::INTEGER as overdue_tasks,
        COUNT(DISTINCT CASE WHEN t.status = 'pending' THEN t.id END)::INTEGER as pending_tasks,
        COUNT(DISTINCT e.id)::INTEGER as total_emails,
        AVG(e.sentiment_score) as avg_sentiment
    FROM clients c
    LEFT JOIN tasks t ON t.client_id = c.id
    LEFT JOIN emails e ON e.client_id = c.id
    WHERE c.id = p_client_id
    GROUP BY c.id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
