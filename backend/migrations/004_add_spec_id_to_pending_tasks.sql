-- Migration: Add spec_id to pending_tasks for bidirectional linking
-- This allows tasks to reference their generated specs, and specs to find their source tasks

-- Add spec_id column to pending_tasks
ALTER TABLE pending_tasks
ADD COLUMN spec_id UUID REFERENCES project_specs(id) ON DELETE SET NULL;

-- Create index for performance when looking up tasks by spec
CREATE INDEX idx_pending_tasks_spec_id ON pending_tasks(spec_id);

-- Add comment for documentation
COMMENT ON COLUMN pending_tasks.spec_id IS 'Links to the project spec generated from this task email';
