-- Google Calendar OAuth tokens per workspace (for availability + book).
-- Use same pattern as zoom_accounts; encrypt tokens in production.

BEGIN;

CREATE TABLE IF NOT EXISTS revenue_operator.google_calendar_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL UNIQUE REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_google_calendar_tokens_workspace
  ON revenue_operator.google_calendar_tokens(workspace_id);

COMMIT;
