-- Add mode and industry columns to workspaces for V4 onboarding
ALTER TABLE revenue_operator.workspaces
  ADD COLUMN IF NOT EXISTS mode text CHECK (mode IN ('solo', 'sales', 'business')) DEFAULT 'business',
  ADD COLUMN IF NOT EXISTS industry text;

-- Index for querying workspaces by mode/industry
CREATE INDEX IF NOT EXISTS idx_workspaces_mode ON revenue_operator.workspaces (mode);
CREATE INDEX IF NOT EXISTS idx_workspaces_industry ON revenue_operator.workspaces (industry);
