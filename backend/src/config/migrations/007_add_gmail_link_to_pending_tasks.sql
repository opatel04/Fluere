-- Migration: Add gmail_link to pending_tasks table
-- This allows users to click through to view the original email in Gmail

ALTER TABLE pending_tasks
ADD COLUMN IF NOT EXISTS gmail_link TEXT;

-- Backfill existing pending tasks with gmail_link from emails table
UPDATE pending_tasks pt
SET gmail_link = e.gmail_link
FROM emails e
WHERE pt.email_id = e.gmail_id
  AND pt.gmail_link IS NULL;
