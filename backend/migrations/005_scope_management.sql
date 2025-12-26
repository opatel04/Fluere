-- Migration 005: Scope Management System

-- Project Specs Table
CREATE TABLE IF NOT EXISTS project_specs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    project_name VARCHAR(255) NOT NULL,
    current_version INTEGER DEFAULT 1,
    status VARCHAR(50) DEFAULT 'draft', -- draft, locked, archived
    trello_card_id VARCHAR(255),
    trello_board_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    locked_at TIMESTAMP,
    UNIQUE(user_id, project_name)
);

CREATE INDEX IF NOT EXISTS idx_project_specs_user_id ON project_specs(user_id);
CREATE INDEX IF NOT EXISTS idx_project_specs_client_id ON project_specs(client_id);
CREATE INDEX IF NOT EXISTS idx_project_specs_status ON project_specs(status);

CREATE TRIGGER update_project_specs_updated_at BEFORE UPDATE ON project_specs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Spec Versions Table
CREATE TABLE IF NOT EXISTS spec_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    spec_id UUID REFERENCES project_specs(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    content JSONB NOT NULL, -- Full spec structure
    change_summary TEXT,
    change_reason TEXT,
    created_by VARCHAR(50) DEFAULT 'user', -- user, system
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(spec_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_spec_versions_spec_id ON spec_versions(spec_id);

-- Scope Creep Alerts Table
CREATE TABLE IF NOT EXISTS scope_creep_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    spec_id UUID REFERENCES project_specs(id) ON DELETE CASCADE,
    email_id UUID REFERENCES emails(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    severity VARCHAR(20), -- high, medium, low
    category VARCHAR(50), -- exclusion_violation, new_deliverable, etc.
    client_quote TEXT,
    ai_summary TEXT,
    ai_reasoning TEXT,
    estimated_hours FLOAT,
    original_spec_snapshot JSONB,
    detected_deviation JSONB,
    status VARCHAR(50) DEFAULT 'pending', -- pending, resolved, dismissed, false_positive
    resolution_type VARCHAR(50), -- billed, spec_updated, ignored
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_scope_creep_alerts_spec_id ON scope_creep_alerts(spec_id);
CREATE INDEX IF NOT EXISTS idx_scope_creep_alerts_status ON scope_creep_alerts(status);
CREATE INDEX IF NOT EXISTS idx_scope_creep_alerts_severity ON scope_creep_alerts(severity);

-- Add spec_id to Trello Cards (optional linkage)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trello_cards' AND column_name='spec_id') THEN
        ALTER TABLE trello_cards ADD COLUMN spec_id UUID REFERENCES project_specs(id) ON DELETE SET NULL;
    END IF;
END $$;
