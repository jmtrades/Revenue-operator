-- Call-Aware Revenue Operator: Zoom integration
-- zoom_accounts, call_assets, call_analysis; extend call_sessions

BEGIN;

-- Zoom OAuth tokens (encrypted at rest)
CREATE TABLE IF NOT EXISTS revenue_operator.zoom_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL UNIQUE REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  zoom_user_id text NOT NULL,
  access_token_enc text NOT NULL,
  refresh_token_enc text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Call assets (recordings, transcripts)
CREATE TABLE IF NOT EXISTS revenue_operator.call_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  call_session_id uuid REFERENCES revenue_operator.call_sessions(id) ON DELETE CASCADE,
  type text NOT NULL,
  provider text DEFAULT 'zoom',
  external_id text,
  url text,
  content_text text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Call analysis results
CREATE TABLE IF NOT EXISTS revenue_operator.call_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  call_session_id uuid NOT NULL REFERENCES revenue_operator.call_sessions(id) ON DELETE CASCADE,
  analysis_json jsonb NOT NULL DEFAULT '{}',
  confidence numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Extend call_sessions for Zoom
ALTER TABLE revenue_operator.call_sessions
  ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS external_meeting_id text,
  ADD COLUMN IF NOT EXISTS external_meeting_uuid text,
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS matched_lead_id uuid REFERENCES revenue_operator.leads(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS matched_confidence numeric,
  ADD COLUMN IF NOT EXISTS call_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS call_ended_at timestamptz,
  ADD COLUMN IF NOT EXISTS transcript_text text,
  ADD COLUMN IF NOT EXISTS consent_granted boolean,
  ADD COLUMN IF NOT EXISTS consent_mode text;

-- Allow unmatched calls (lead_id nullable for Zoom-sourced sessions)
ALTER TABLE revenue_operator.call_sessions ALTER COLUMN lead_id DROP NOT NULL;

-- Settings: call-aware + consent
ALTER TABLE revenue_operator.settings
  ADD COLUMN IF NOT EXISTS call_aware_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS consent_mode text DEFAULT 'soft';

-- Activation states (create if not exists, e.g. when final_adoption_upgrade not run)
CREATE TABLE IF NOT EXISTS revenue_operator.activation_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL UNIQUE REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  step text NOT NULL DEFAULT 'scan',
  opportunities_found integer DEFAULT 0,
  simulated_actions_count integer DEFAULT 0,
  activated_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Activation states: Zoom status columns
ALTER TABLE revenue_operator.activation_states
  ADD COLUMN IF NOT EXISTS zoom_connected boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS zoom_webhook_verified boolean DEFAULT false;

-- Backfill workspace_id on existing call_sessions from lead
UPDATE revenue_operator.call_sessions cs
SET workspace_id = l.workspace_id
FROM revenue_operator.leads l
WHERE cs.lead_id = l.id AND cs.workspace_id IS NULL;

COMMIT;
