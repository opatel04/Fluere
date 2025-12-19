-- Migration: Add notification preferences columns to user_preferences table
-- Created: 2025-12-19

-- Add notification preference columns
ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS daily_summary_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS daily_summary_time TIME DEFAULT '08:00:00',
ADD COLUMN IF NOT EXISTS daily_summary_timezone VARCHAR(100) DEFAULT 'UTC',
ADD COLUMN IF NOT EXISTS weekly_report_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS follow_up_notifications_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS follow_up_threshold_days INTEGER DEFAULT 2,
ADD COLUMN IF NOT EXISTS sentiment_analysis_enabled BOOLEAN DEFAULT true;

-- Add comment to describe the table
COMMENT ON TABLE user_preferences IS 'User preferences including notification settings and board customization';
