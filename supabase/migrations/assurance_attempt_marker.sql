-- Assurance attempt marker: when delivery was attempted but undeliverable (no PII).
-- Used so core-status can show assurance_attempted_recently true when Resend/owner missing.

CREATE TABLE IF NOT EXISTS revenue_operator.assurance_attempt_marker (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  attempted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assurance_attempt_marker_workspace_attempted
  ON revenue_operator.assurance_attempt_marker (workspace_id, attempted_at DESC);
