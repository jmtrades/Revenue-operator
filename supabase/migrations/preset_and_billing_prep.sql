-- Preset system + business model prep
-- Recall-Touch: workspace = one business location; future billing by conversations_handled, locations, human takeover seats

BEGIN;

-- Settings: business_type (if missing), preset_id, preset_applied_at
ALTER TABLE revenue_operator.settings
  ADD COLUMN IF NOT EXISTS business_type text,
  ADD COLUMN IF NOT EXISTS preset_id text DEFAULT 'default',
  ADD COLUMN IF NOT EXISTS preset_applied_at timestamptz;

-- Workspaces: prep for future billing (conversations handled, locations)
ALTER TABLE revenue_operator.workspaces
  ADD COLUMN IF NOT EXISTS conversations_handled integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS location_count integer DEFAULT 1;

COMMIT;
