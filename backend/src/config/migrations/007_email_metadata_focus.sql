-- Migration: 007_email_metadata_focus
-- Purpose: Pivot to metadata-focused email processing with minimal AI usage
-- Strategy: Store only essential metadata + Gmail link, categorize cheaply, extract tasks on-demand
-- Cost Savings: ~99% reduction in AI processing costs

-- Add new columns to emails table for lightweight processing
DO $$
BEGIN
    -- Gmail link for opening email directly in Gmail
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='emails' AND column_name='gmail_link') THEN
        ALTER TABLE emails ADD COLUMN gmail_link TEXT;
    END IF;

    -- Category for quick organization (finance, coding, accounting, legal, etc.)
    -- Populated with cheap AI call on subject + snippet only
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='emails' AND column_name='category') THEN
        ALTER TABLE emails ADD COLUMN category VARCHAR(100);
    END IF;

    -- Rule-based task detection (no AI needed)
    -- Keywords: "can you", "please", "need", "by", "deadline", etc.
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='emails' AND column_name='likely_has_task') THEN
        ALTER TABLE emails ADD COLUMN likely_has_task BOOLEAN DEFAULT false;
    END IF;

    -- Snippet for quick preview (Gmail provides this, no AI needed)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='emails' AND column_name='snippet') THEN
        ALTER TABLE emails ADD COLUMN snippet TEXT;
    END IF;

    -- Track if full AI processing was done (for on-demand extraction)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='emails' AND column_name='full_ai_processed') THEN
        ALTER TABLE emails ADD COLUMN full_ai_processed BOOLEAN DEFAULT false;
    END IF;

    -- Track when full AI processing was done
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='emails' AND column_name='full_ai_processed_at') THEN
        ALTER TABLE emails ADD COLUMN full_ai_processed_at TIMESTAMP;
    END IF;
END $$;

-- Create index for category filtering
CREATE INDEX IF NOT EXISTS idx_emails_category ON emails(category);

-- Create index for task detection
CREATE INDEX IF NOT EXISTS idx_emails_likely_has_task ON emails(likely_has_task);

-- Create index for full AI processing tracking
CREATE INDEX IF NOT EXISTS idx_emails_full_ai_processed ON emails(full_ai_processed);

-- Comment on the new approach
COMMENT ON COLUMN emails.gmail_link IS 'Direct link to email in Gmail - users read emails there, not in our app';
COMMENT ON COLUMN emails.category IS 'Quick categorization (finance, coding, etc.) using cheap AI on subject + snippet only';
COMMENT ON COLUMN emails.likely_has_task IS 'Rule-based detection using keywords - no AI needed';
COMMENT ON COLUMN emails.snippet IS 'Email preview text from Gmail API - no AI processing required';
COMMENT ON COLUMN emails.full_ai_processed IS 'Whether expensive AI task extraction was done (on-demand only)';

-- Update existing gmail_links for emails that already exist
-- Gmail link format: https://mail.google.com/mail/u/0/#inbox/{gmail_id}
UPDATE emails
SET gmail_link = 'https://mail.google.com/mail/u/0/#inbox/' || gmail_id
WHERE gmail_link IS NULL AND gmail_id IS NOT NULL;
