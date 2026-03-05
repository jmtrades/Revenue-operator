-- Production readiness: workspace onboarding/agent columns for Recall Touch app
-- Idempotent: ADD COLUMN IF NOT EXISTS

BEGIN;

-- Workspace: onboarding and agent fields (for /activate and app sidebar)
ALTER TABLE revenue_operator.workspaces
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS agent_template text,
  ADD COLUMN IF NOT EXISTS agent_name text,
  ADD COLUMN IF NOT EXISTS greeting text,
  ADD COLUMN IF NOT EXISTS knowledge_items jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS vapi_assistant_id text;

-- name is already NOT NULL; use it as business_name in API
COMMENT ON COLUMN revenue_operator.workspaces.name IS 'Business/workspace display name (business_name in API)';

COMMIT;
