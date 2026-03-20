-- Add columns required by the voice call-flow engine (call-flow.ts, compile.ts).
-- All columns are optional / have defaults so existing rows remain valid.
-- Idempotent: uses ADD COLUMN IF NOT EXISTS throughout.

BEGIN;

-- ============================================================
-- 1. workspace_business_context — fields for Business Brain
-- ============================================================
ALTER TABLE revenue_operator.workspace_business_context
  ADD COLUMN IF NOT EXISTS industry text,
  ADD COLUMN IF NOT EXISTS services text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS emergencies_after_hours text CHECK (emergencies_after_hours IN ('call_me', 'message', 'next_day')) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS appointment_handling text CHECK (appointment_handling IN ('calendar', 'capture')) DEFAULT NULL;

COMMENT ON COLUMN revenue_operator.workspace_business_context.industry IS 'Primary industry — drives industry pack + compliance block selection.';
COMMENT ON COLUMN revenue_operator.workspace_business_context.services IS 'Comma-separated or free-text list of services offered.';
COMMENT ON COLUMN revenue_operator.workspace_business_context.address IS 'Business address for the agent to reference on calls.';
COMMENT ON COLUMN revenue_operator.workspace_business_context.phone IS 'Primary business phone the agent can share with callers.';
COMMENT ON COLUMN revenue_operator.workspace_business_context.emergencies_after_hours IS 'After-hours policy: call_me, message, or next_day.';
COMMENT ON COLUMN revenue_operator.workspace_business_context.appointment_handling IS 'Booking style: calendar (direct) or capture (info only).';

-- ============================================================
-- 2. agents — template tracking and language
-- ============================================================
ALTER TABLE revenue_operator.agents
  ADD COLUMN IF NOT EXISTS template_id text,
  ADD COLUMN IF NOT EXISTS is_primary boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS preferred_language text DEFAULT 'en';

COMMENT ON COLUMN revenue_operator.agents.template_id IS 'ID from agent-templates library — drives tool selection.';
COMMENT ON COLUMN revenue_operator.agents.is_primary IS 'Marks the default inbound-call agent for this workspace.';
COMMENT ON COLUMN revenue_operator.agents.preferred_language IS 'ISO 639-1 code (e.g. en, es, fr) for agent primary language.';

CREATE INDEX IF NOT EXISTS idx_agents_workspace_primary
  ON revenue_operator.agents (workspace_id)
  WHERE is_primary = true;

-- ============================================================
-- 3. call_sessions — topics for call context
-- ============================================================
ALTER TABLE revenue_operator.call_sessions
  ADD COLUMN IF NOT EXISTS topics text[] DEFAULT '{}';

COMMENT ON COLUMN revenue_operator.call_sessions.topics IS 'Tags extracted from post-call analysis, e.g. pricing, scheduling.';

-- ============================================================
-- 4. workspaces — default voice for the workspace
-- ============================================================
ALTER TABLE revenue_operator.workspaces
  ADD COLUMN IF NOT EXISTS default_voice_id text;

COMMENT ON COLUMN revenue_operator.workspaces.default_voice_id IS 'Default voice model ID used when agent has no override.';

COMMIT;
