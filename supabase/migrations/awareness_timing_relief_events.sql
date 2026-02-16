-- Awareness timing: relief events (store only) and delivery state (throttle + escalation contrast).
-- No UI. Messages only after a prevented problem.

CREATE TABLE IF NOT EXISTS revenue_operator.recent_relief_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recent_relief_events_workspace_created
  ON revenue_operator.recent_relief_events(workspace_id, created_at DESC);

CREATE TABLE IF NOT EXISTS revenue_operator.relief_delivery_state (
  workspace_id uuid PRIMARY KEY REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  last_relief_sent_at timestamptz,
  last_escalation_contrast_sent_at timestamptz,
  removal_sensitivity_sent_at date
);
