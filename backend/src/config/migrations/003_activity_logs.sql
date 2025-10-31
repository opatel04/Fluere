-- Migration: Activity Logs System
-- Purpose: Track all user actions and system events for auditing and debugging
-- Created: 2024-10-29

-- Activity logs table
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL, -- 'task_created', 'email_processed', 'board_connected', etc.
    resource_type VARCHAR(50) NOT NULL, -- 'task', 'email', 'board', 'card', 'webhook', etc.
    resource_id VARCHAR(255), -- UUID or external ID of the resource
    resource_name VARCHAR(500), -- Human-readable name (e.g., task title, board name)

    -- Action details
    action_status VARCHAR(50) DEFAULT 'success', -- success, failed, pending
    action_details JSONB, -- Additional context about the action
    error_message TEXT, -- Error details if action failed

    -- Request metadata
    ip_address INET, -- IP address of the user
    user_agent TEXT, -- Browser/client information

    -- Timing
    duration_ms INTEGER, -- How long the action took
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_resource_type ON activity_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_status ON activity_logs(action_status);

-- Create a composite index for user activity timeline queries
CREATE INDEX idx_activity_logs_user_timeline ON activity_logs(user_id, created_at DESC);

-- Create a partial index for failed actions (useful for debugging)
CREATE INDEX idx_activity_logs_failed ON activity_logs(action_status, created_at DESC)
WHERE action_status = 'failed';

-- Function to clean up old activity logs (optional, for data retention)
CREATE OR REPLACE FUNCTION cleanup_old_activity_logs(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM activity_logs
  WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Comment on the table
COMMENT ON TABLE activity_logs IS 'Tracks all user actions and system events for auditing and debugging';
COMMENT ON COLUMN activity_logs.action IS 'Action type: task_created, email_processed, board_connected, webhook_received, etc.';
COMMENT ON COLUMN activity_logs.resource_type IS 'Type of resource affected: task, email, board, card, webhook, etc.';
COMMENT ON COLUMN activity_logs.action_details IS 'JSON object with additional context specific to the action';
COMMENT ON COLUMN activity_logs.duration_ms IS 'Duration of the action in milliseconds';

-- Sample activity log actions (for reference)
-- User actions:
--   - user_registered, user_login, user_logout
--   - gmail_connected, gmail_disconnected, trello_connected, trello_disconnected
--   - board_connected, board_disconnected
--   - task_created, task_updated, task_deleted, task_completed
--   - card_created, card_updated, card_deleted
--   - rule_created, rule_updated, rule_deleted
--   - preferences_updated
--
-- System actions:
--   - email_fetched, email_processed, email_processing_failed
--   - webhook_received, webhook_processed, webhook_failed
--   - ai_analysis_started, ai_analysis_completed, ai_analysis_failed
--   - sync_started, sync_completed, sync_failed
--   - automation_triggered, automation_completed, automation_failed
