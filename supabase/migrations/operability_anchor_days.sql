-- Billing stability: record days when process maintained operation (internal only).

CREATE TABLE IF NOT EXISTS revenue_operator.operability_anchor_days (
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  anchored_utc_date date NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, anchored_utc_date)
);

CREATE INDEX IF NOT EXISTS idx_operability_anchor_days_workspace_date
  ON revenue_operator.operability_anchor_days(workspace_id, anchored_utc_date DESC);
