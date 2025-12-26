-- Migration: Add Client Association to Pending Tasks
-- Purpose: Link pending tasks to clients for freelancer workflow
-- Created: 2024-11-25

-- ====================
-- 1. ADD CLIENT_ID TO PENDING_TASKS
-- ====================

DO $$
BEGIN
    -- Add client_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='pending_tasks' AND column_name='client_id') THEN
        ALTER TABLE pending_tasks
        ADD COLUMN client_id UUID REFERENCES clients(id) ON DELETE SET NULL;

        -- Add index for performance
        CREATE INDEX idx_pending_tasks_client_id ON pending_tasks(client_id);

        -- Add composite index for common queries
        CREATE INDEX idx_pending_tasks_user_client ON pending_tasks(user_id, client_id);

        RAISE NOTICE 'Added client_id to pending_tasks table';
    ELSE
        RAISE NOTICE 'client_id column already exists in pending_tasks';
    END IF;
END $$;

-- ====================
-- 2. BACKFILL CLIENT_ID FOR EXISTING TASKS
-- ====================

-- Create a function to backfill client_id based on email_from
CREATE OR REPLACE FUNCTION backfill_pending_tasks_client_id()
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER := 0;
    task_record RECORD;
    detected_client_id UUID;
BEGIN
    -- Loop through pending_tasks without client_id
    FOR task_record IN
        SELECT id, user_id, email_from
        FROM pending_tasks
        WHERE client_id IS NULL AND email_from IS NOT NULL
    LOOP
        -- Extract email from "Name <email>" format
        -- email_from might be "John Doe <john@example.com>" or just "john@example.com"

        -- Try to find existing client by email
        SELECT c.id INTO detected_client_id
        FROM clients c
        WHERE c.user_id = task_record.user_id
        AND (
            c.email = task_record.email_from
            OR c.email = SUBSTRING(task_record.email_from FROM '<(.+)>')
            OR task_record.email_from LIKE '%<' || c.email || '>%'
        )
        LIMIT 1;

        -- If client found, update the pending task
        IF detected_client_id IS NOT NULL THEN
            UPDATE pending_tasks
            SET client_id = detected_client_id,
                updated_at = NOW()
            WHERE id = task_record.id;

            updated_count := updated_count + 1;
        END IF;
    END LOOP;

    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Run the backfill (this is safe to run multiple times)
DO $$
DECLARE
    count INTEGER;
BEGIN
    SELECT backfill_pending_tasks_client_id() INTO count;
    RAISE NOTICE 'Backfilled client_id for % pending tasks', count;
END $$;

-- ====================
-- 3. COMMENTS
-- ====================

COMMENT ON COLUMN pending_tasks.client_id IS 'Reference to the client who sent the email that created this task';

-- ====================
-- MIGRATION COMPLETE
-- ====================
