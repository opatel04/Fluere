-- Migration: Freelancer Pivot - Client Management System
-- Purpose: Transform TaskSnap into email-native freelancer client management tool
-- Created: 2024-10-30

-- ====================
-- 1. CLIENT MANAGEMENT
-- ====================

-- Create clients table if it doesn't exist
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    company VARCHAR(255),
    phone VARCHAR(50),

    -- Communication tracking
    email_count INTEGER DEFAULT 0,
    first_contact_date TIMESTAMP,
    last_contact_date TIMESTAMP,

    -- Status and health
    status TEXT DEFAULT 'active', -- active, at_risk, churned
    health_score INTEGER DEFAULT 100, -- 0-100 scale
    health_updated_at TIMESTAMP,

    -- Notes and metadata
    notes TEXT,
    metadata JSONB, -- For custom fields

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(user_id, email)
);

CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_health_score ON clients(health_score);
CREATE INDEX IF NOT EXISTS idx_clients_last_contact ON clients(last_contact_date DESC);

-- Add trigger for clients updated_at
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ====================
-- 2. EMAIL ENHANCEMENTS
-- ====================

-- Add new columns to emails table for better tracking
DO $$
BEGIN
    -- Thread tracking
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='emails' AND column_name='in_reply_to') THEN
        ALTER TABLE emails ADD COLUMN in_reply_to TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='emails' AND column_name='references') THEN
        ALTER TABLE emails ADD COLUMN "references" TEXT[];
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='emails' AND column_name='is_reply') THEN
        ALTER TABLE emails ADD COLUMN is_reply BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='emails' AND column_name='reply_count') THEN
        ALTER TABLE emails ADD COLUMN reply_count INTEGER DEFAULT 0;
    END IF;

    -- Sentiment analysis
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='emails' AND column_name='sentiment') THEN
        ALTER TABLE emails ADD COLUMN sentiment TEXT; -- positive, neutral, negative
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='emails' AND column_name='sentiment_score') THEN
        ALTER TABLE emails ADD COLUMN sentiment_score INTEGER; -- 0-10
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='emails' AND column_name='sentiment_reason') THEN
        ALTER TABLE emails ADD COLUMN sentiment_reason TEXT;
    END IF;

    -- Client association
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='emails' AND column_name='client_id') THEN
        ALTER TABLE emails ADD COLUMN client_id UUID REFERENCES clients(id) ON DELETE SET NULL;
    END IF;

    -- Email type and direction
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='emails' AND column_name='email_type') THEN
        ALTER TABLE emails ADD COLUMN email_type TEXT DEFAULT 'inbound'; -- inbound, outbound
    END IF;
END $$;

-- Add index for client_id
CREATE INDEX IF NOT EXISTS idx_emails_client_id ON emails(client_id);
CREATE INDEX IF NOT EXISTS idx_emails_thread_id ON emails(thread_id);
CREATE INDEX IF NOT EXISTS idx_emails_sentiment ON emails(sentiment);

-- ====================
-- 3. FOLLOW-UP TRACKING
-- ====================

CREATE TABLE IF NOT EXISTS follow_ups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    email_id UUID REFERENCES emails(id) ON DELETE CASCADE,
    thread_id TEXT NOT NULL,

    -- Follow-up details
    days_since_client_message INTEGER NOT NULL,
    urgency_score INTEGER DEFAULT 5, -- 1-10 scale
    client_message_snippet TEXT,
    suggested_response TEXT, -- AI-generated draft

    -- Status tracking
    status TEXT DEFAULT 'pending', -- pending, dismissed, responded
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

-- Add trigger for follow_ups updated_at
CREATE TRIGGER update_follow_ups_updated_at BEFORE UPDATE ON follow_ups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ====================
-- 4. CLIENT SENTIMENT HISTORY
-- ====================

CREATE TABLE IF NOT EXISTS client_sentiment_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    date DATE NOT NULL,

    -- Aggregate sentiment scores
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

-- ====================
-- 5. USER PREFERENCES ENHANCEMENTS
-- ====================

-- Add new preference columns
DO $$
BEGIN
    -- Follow-up preferences
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='user_preferences' AND column_name='follow_up_notifications_enabled') THEN
        ALTER TABLE user_preferences ADD COLUMN follow_up_notifications_enabled BOOLEAN DEFAULT true;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='user_preferences' AND column_name='follow_up_threshold_days') THEN
        ALTER TABLE user_preferences ADD COLUMN follow_up_threshold_days INTEGER DEFAULT 2;
    END IF;

    -- Daily summary preferences
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='user_preferences' AND column_name='daily_summary_enabled') THEN
        ALTER TABLE user_preferences ADD COLUMN daily_summary_enabled BOOLEAN DEFAULT true;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='user_preferences' AND column_name='daily_summary_time') THEN
        ALTER TABLE user_preferences ADD COLUMN daily_summary_time TIME DEFAULT '08:00:00';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='user_preferences' AND column_name='daily_summary_timezone') THEN
        ALTER TABLE user_preferences ADD COLUMN daily_summary_timezone TEXT DEFAULT 'UTC';
    END IF;

    -- Weekly report preferences
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='user_preferences' AND column_name='weekly_report_enabled') THEN
        ALTER TABLE user_preferences ADD COLUMN weekly_report_enabled BOOLEAN DEFAULT true;
    END IF;

    -- Sentiment analysis toggle
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='user_preferences' AND column_name='sentiment_analysis_enabled') THEN
        ALTER TABLE user_preferences ADD COLUMN sentiment_analysis_enabled BOOLEAN DEFAULT true;
    END IF;
END $$;

-- ====================
-- 6. TASK ENHANCEMENTS
-- ====================

-- Add client_id to tasks table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='tasks' AND column_name='client_id') THEN
        ALTER TABLE tasks ADD COLUMN client_id UUID REFERENCES clients(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='tasks' AND column_name='is_overdue') THEN
        ALTER TABLE tasks ADD COLUMN is_overdue BOOLEAN DEFAULT false;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tasks_client_id ON tasks(client_id);
CREATE INDEX IF NOT EXISTS idx_tasks_is_overdue ON tasks(is_overdue);

-- ====================
-- 7. DAILY SUMMARIES LOG
-- ====================

CREATE TABLE IF NOT EXISTS daily_summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    summary_date DATE NOT NULL,

    -- Summary content
    summary_text TEXT NOT NULL,
    summary_data JSONB, -- Raw data used to generate summary

    -- Stats
    tasks_due_today INTEGER DEFAULT 0,
    tasks_due_tomorrow INTEGER DEFAULT 0,
    pending_follow_ups INTEGER DEFAULT 0,
    active_clients INTEGER DEFAULT 0,

    -- Delivery tracking
    email_sent BOOLEAN DEFAULT false,
    sent_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(user_id, summary_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_summaries_user_id ON daily_summaries(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_summaries_date ON daily_summaries(summary_date DESC);

-- ====================
-- 8. INBOUND EMAIL TRACKING
-- ====================

CREATE TABLE IF NOT EXISTS inbound_emails (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    -- Email details
    from_email VARCHAR(255) NOT NULL,
    from_name VARCHAR(255),
    to_email VARCHAR(255) NOT NULL,
    subject TEXT,
    body_text TEXT,
    body_html TEXT,

    -- Email metadata
    message_id TEXT,
    in_reply_to TEXT,
    "references" TEXT[],

    -- Processing status
    processing_status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed
    processed_at TIMESTAMP,
    error_message TEXT,

    -- Associations
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    email_id UUID REFERENCES emails(id) ON DELETE SET NULL,

    -- Metadata
    raw_data JSONB, -- Store full email data

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_inbound_emails_user_id ON inbound_emails(user_id);
CREATE INDEX IF NOT EXISTS idx_inbound_emails_from_email ON inbound_emails(from_email);
CREATE INDEX IF NOT EXISTS idx_inbound_emails_client_id ON inbound_emails(client_id);
CREATE INDEX IF NOT EXISTS idx_inbound_emails_status ON inbound_emails(processing_status);
CREATE INDEX IF NOT EXISTS idx_inbound_emails_created_at ON inbound_emails(created_at DESC);

-- Add trigger for inbound_emails updated_at
CREATE TRIGGER update_inbound_emails_updated_at BEFORE UPDATE ON inbound_emails
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ====================
-- 9. HELPER FUNCTIONS
-- ====================

-- Function to update client activity when email is received
CREATE OR REPLACE FUNCTION update_client_activity()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.client_id IS NOT NULL THEN
        UPDATE clients
        SET
            email_count = email_count + 1,
            last_contact_date = NEW.received_at,
            first_contact_date = COALESCE(first_contact_date, NEW.received_at),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.client_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to emails table
DROP TRIGGER IF EXISTS trigger_update_client_activity ON emails;
CREATE TRIGGER trigger_update_client_activity
    AFTER INSERT ON emails
    FOR EACH ROW
    WHEN (NEW.client_id IS NOT NULL)
    EXECUTE FUNCTION update_client_activity();

-- Function to calculate overdue tasks
CREATE OR REPLACE FUNCTION update_overdue_tasks()
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE tasks
    SET is_overdue = true
    WHERE due_date < NOW()
    AND status NOT IN ('completed', 'cancelled')
    AND is_overdue = false;

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get client stats
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

-- ====================
-- 10. COMMENTS
-- ====================

COMMENT ON TABLE clients IS 'Stores freelancer client information and communication history';
COMMENT ON TABLE follow_ups IS 'Tracks client emails that need responses from freelancer';
COMMENT ON TABLE client_sentiment_history IS 'Daily aggregate of client email sentiment for trend analysis';
COMMENT ON TABLE daily_summaries IS 'Generated daily summaries sent to users';
COMMENT ON TABLE inbound_emails IS 'Tracks forwarded emails received via Resend/SendGrid';

COMMENT ON COLUMN clients.health_score IS 'Client relationship health score (0-100) based on response time, overdue tasks, and communication frequency';
COMMENT ON COLUMN follow_ups.urgency_score IS 'Follow-up urgency score (1-10) based on days elapsed, sentiment, and client value';
COMMENT ON COLUMN emails.sentiment IS 'AI-analyzed email sentiment: positive, neutral, or negative';

-- ====================
-- MIGRATION COMPLETE
-- ====================
