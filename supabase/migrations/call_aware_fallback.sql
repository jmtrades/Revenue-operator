-- Call-Aware Fallback: show/no-show, wrap-up, calendar-only, Zoom health
-- Additive only. Run after call_aware_zoom.sql

BEGIN;

-- call_sessions: show inference + calendar dedupe + metadata
ALTER TABLE revenue_operator.call_sessions
  ADD COLUMN IF NOT EXISTS show_status text CHECK (show_status IN ('showed', 'no_show', 'unknown')),
  ADD COLUMN IF NOT EXISTS show_confidence numeric CHECK (show_confidence IS NULL OR (show_confidence >= 0 AND show_confidence <= 1)),
  ADD COLUMN IF NOT EXISTS show_reason text,
  ADD COLUMN IF NOT EXISTS external_event_id text,
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';

-- Unique constraint for calendar dedupe (workspace + external_event_id)
CREATE UNIQUE INDEX IF NOT EXISTS call_sessions_workspace_external_event_id
  ON revenue_operator.call_sessions (workspace_id, external_event_id)
  WHERE external_event_id IS NOT NULL AND workspace_id IS NOT NULL;

-- call_analysis: record analysis source (zoom_transcript, calendar_fallback, wrap_up)
ALTER TABLE revenue_operator.call_analysis
  ADD COLUMN IF NOT EXISTS analysis_source text;

-- Wrap-up tokens (one-time, expiring)
CREATE TABLE IF NOT EXISTS revenue_operator.call_wrapup_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  call_session_id uuid NOT NULL REFERENCES revenue_operator.call_sessions(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS call_wrapup_tokens_token_hash ON revenue_operator.call_wrapup_tokens (token_hash);
CREATE INDEX IF NOT EXISTS call_wrapup_tokens_call_session ON revenue_operator.call_wrapup_tokens (call_session_id);

-- Wrap-up submissions
CREATE TABLE IF NOT EXISTS revenue_operator.call_wrapups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_session_id uuid NOT NULL REFERENCES revenue_operator.call_sessions(id) ON DELETE CASCADE,
  outcome text NOT NULL CHECK (outcome IN ('interested', 'thinking', 'not_fit')),
  objection_text text,
  submitted_by text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS call_wrapups_call_session ON revenue_operator.call_wrapups (call_session_id);

-- Zoom health (optional columns on zoom_accounts)
ALTER TABLE revenue_operator.zoom_accounts
  ADD COLUMN IF NOT EXISTS last_webhook_at timestamptz,
  ADD COLUMN IF NOT EXISTS disconnected_at timestamptz;

-- job_queue locking columns if missing (used by queue/index)
ALTER TABLE revenue_operator.job_queue
  ADD COLUMN IF NOT EXISTS locked_by text,
  ADD COLUMN IF NOT EXISTS locked_at timestamptz,
  ADD COLUMN IF NOT EXISTS completion_id text;

-- Calendar events (for minimal calendar-ended detector: cron checks recently ended)
CREATE TABLE IF NOT EXISTS revenue_operator.calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  external_event_id text NOT NULL,
  title text,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  status text DEFAULT 'confirmed',
  attendees jsonb DEFAULT '[]',
  meeting_link text,
  meeting_link_domain text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(workspace_id, external_event_id)
);

CREATE INDEX IF NOT EXISTS calendar_events_workspace_end ON revenue_operator.calendar_events (workspace_id, end_at);

COMMIT;
npm run build
