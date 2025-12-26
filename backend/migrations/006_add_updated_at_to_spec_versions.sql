-- Migration 006: Add updated_at to spec_versions

ALTER TABLE spec_versions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Create trigger to update updated_at on change
DROP TRIGGER IF EXISTS update_spec_versions_updated_at ON spec_versions;
CREATE TRIGGER update_spec_versions_updated_at BEFORE UPDATE ON spec_versions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
