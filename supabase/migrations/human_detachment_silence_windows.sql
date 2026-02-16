-- Operational silence: no provider interaction for a period while outcomes resolved.

CREATE TABLE IF NOT EXISTS revenue_operator.operational_silence_windows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL,
  ended_at timestamptz NOT NULL,
  outcomes_resolved boolean NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_operational_silence_workspace_ended
  ON revenue_operator.operational_silence_windows(workspace_id, ended_at DESC);
