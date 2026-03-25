-- Beta-ready columns for Recall Touch voice operator.
-- Safe to re-run: uses ADD COLUMN IF NOT EXISTS and CREATE TABLE IF NOT EXISTS.

-- Workspace columns
ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS use_cases TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS webhook_url TEXT,
  ADD COLUMN IF NOT EXISTS verified_phone TEXT;

-- Agent columns
ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS primary_goal TEXT,
  ADD COLUMN IF NOT EXISTS business_context TEXT,
  ADD COLUMN IF NOT EXISTS target_audience TEXT,
  ADD COLUMN IF NOT EXISTS assertiveness TEXT DEFAULT 'balanced',
  ADD COLUMN IF NOT EXISTS learned_behaviors TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS tested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS vapi_agent_id TEXT;

-- Call intelligence columns
ALTER TABLE call_examples
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

ALTER TABLE call_insights
  ADD COLUMN IF NOT EXISTS applied BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS dismissed BOOLEAN DEFAULT FALSE;

-- Workspace invites (guarded; base table may already exist)
CREATE TABLE IF NOT EXISTS workspace_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  invited_by UUID NOT NULL,
  token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days',
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

