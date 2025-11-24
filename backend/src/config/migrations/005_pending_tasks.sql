-- Pending Tasks Table
-- Migration: 005_pending_tasks
-- Stores AI-extracted tasks awaiting user approval before creating Trello cards

CREATE TABLE IF NOT EXISTS pending_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    email_id VARCHAR(255),
    email_subject VARCHAR(500),
    email_from VARCHAR(255),
    email_date TIMESTAMP,

    -- Task details extracted by AI
    title VARCHAR(500) NOT NULL,
    description TEXT,
    priority VARCHAR(20) DEFAULT 'medium',
    category VARCHAR(100),
    due_date TIMESTAMP,
    estimated_time VARCHAR(50),
    labels JSONB DEFAULT '[]',

    -- Extraction metadata
    confidence FLOAT,
    extraction_source VARCHAR(50) DEFAULT 'automation', -- 'automation', 'manual'

    -- Status tracking
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    approved_at TIMESTAMP,
    rejected_at TIMESTAMP,

    -- Trello destination (set on approval)
    board_id VARCHAR(255),
    list_id VARCHAR(255),
    trello_card_id VARCHAR(255),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for efficient querying
CREATE INDEX idx_pending_tasks_user_id ON pending_tasks(user_id);
CREATE INDEX idx_pending_tasks_status ON pending_tasks(status);
CREATE INDEX idx_pending_tasks_user_status ON pending_tasks(user_id, status);
CREATE INDEX idx_pending_tasks_email_id ON pending_tasks(email_id);
CREATE INDEX idx_pending_tasks_created_at ON pending_tasks(created_at);

-- Trigger for updated_at
CREATE TRIGGER update_pending_tasks_updated_at BEFORE UPDATE ON pending_tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add require_approval flag to user_preferences if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='user_preferences' AND column_name='require_approval') THEN
        ALTER TABLE user_preferences ADD COLUMN require_approval BOOLEAN DEFAULT true;
    END IF;
END $$;
