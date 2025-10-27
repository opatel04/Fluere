-- TaskSnap Database Schema
-- PostgreSQL Database Setup

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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
    organization_style VARCHAR(50) DEFAULT 'priority', -- priority, timeline, person, department, project
    board_strategy VARCHAR(50) DEFAULT 'single', -- single, multiple, hybrid
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
    processing_status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, gmail_id)
);

CREATE INDEX idx_emails_user_id ON emails(user_id);
CREATE INDEX idx_emails_processing_status ON emails(processing_status);
CREATE INDEX idx_emails_processed_at ON emails(processed_at);

-- Email tasks table (tasks extracted from emails)
CREATE TABLE IF NOT EXISTS email_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email_id UUID REFERENCES emails(id) ON DELETE CASCADE,
    task_text TEXT NOT NULL,
    priority_score INTEGER DEFAULT 0, -- 0-100 scale
    priority_level VARCHAR(20) DEFAULT 'medium', -- critical, high, medium, low
    confidence_score FLOAT DEFAULT 0.0, -- AI confidence 0-1
    status VARCHAR(50) DEFAULT 'pending', -- pending, synced, failed
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_email_tasks_email_id ON email_tasks(email_id);
CREATE INDEX idx_email_tasks_status ON email_tasks(status);

-- Tasks table (all tasks - from email and manual)
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    source_type VARCHAR(50) NOT NULL, -- email, chat, manual, api
    source_id UUID, -- Reference to email_id if from email
    content TEXT NOT NULL,
    title VARCHAR(500),
    description TEXT,
    priority VARCHAR(20) DEFAULT 'medium', -- critical, high, medium, low
    priority_score INTEGER DEFAULT 50,
    category VARCHAR(100),
    assigned_to VARCHAR(255),
    department VARCHAR(100),
    status VARCHAR(50) DEFAULT 'pending', -- pending, synced, completed, failed
    due_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_source_type ON tasks(source_type);

-- Task routing rules table
CREATE TABLE IF NOT EXISTS task_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    rule_name VARCHAR(255) NOT NULL,
    rule_type VARCHAR(50) NOT NULL, -- keyword, sender, urgency, custom
    pattern TEXT NOT NULL, -- JSON or regex pattern
    target_board_id VARCHAR(255),
    target_list_id VARCHAR(255),
    priority_modifier INTEGER DEFAULT 0, -- -50 to +50
    is_active BOOLEAN DEFAULT true,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_task_rules_user_id ON task_rules(user_id);
CREATE INDEX idx_task_rules_is_active ON task_rules(is_active);

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

CREATE INDEX idx_trello_boards_user_id ON trello_boards(user_id);
CREATE INDEX idx_trello_boards_sync_enabled ON trello_boards(sync_enabled);

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

CREATE INDEX idx_trello_lists_board_id ON trello_lists(board_id);

-- Trello cards table (synced cards)
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
    sync_status VARCHAR(50) DEFAULT 'synced', -- synced, out_of_sync, error
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(card_id)
);

CREATE INDEX idx_trello_cards_task_id ON trello_cards(task_id);
CREATE INDEX idx_trello_cards_board_id ON trello_cards(board_id);
CREATE INDEX idx_trello_cards_sync_status ON trello_cards(sync_status);

-- AI analysis table
CREATE TABLE IF NOT EXISTS ai_analysis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    analysis_type VARCHAR(50) NOT NULL, -- extraction, prioritization, categorization
    confidence_score FLOAT NOT NULL,
    extracted_entities JSONB, -- Store extracted data as JSON
    model_version VARCHAR(50),
    tokens_used INTEGER,
    processing_time_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ai_analysis_task_id ON ai_analysis(task_id);
CREATE INDEX idx_ai_analysis_type ON ai_analysis(analysis_type);

-- Processing jobs table (for background jobs tracking)
CREATE TABLE IF NOT EXISTS processing_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    job_type VARCHAR(50) NOT NULL, -- email_processing, sync, ai_analysis
    job_status VARCHAR(50) DEFAULT 'queued', -- queued, processing, completed, failed
    job_data JSONB,
    result JSONB,
    error_message TEXT,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_processing_jobs_user_id ON processing_jobs(user_id);
CREATE INDEX idx_processing_jobs_status ON processing_jobs(job_status);
CREATE INDEX idx_processing_jobs_type ON processing_jobs(job_type);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to all tables
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
