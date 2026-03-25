-- Operational presence log: prevents duplicate presence emails, supports suppression.
-- NOT user-visible. Used only to prevent duplicates and enforce priority (6h suppression).

CREATE TABLE IF NOT EXISTS revenue_operator.operational_presence_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('daily', 'weekly', 'monthly', 'escalation', 'decision_required')),
  sent_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_operational_presence_log_workspace_type_sent
  ON revenue_operator.operational_presence_log(workspace_id, type, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_operational_presence_log_sent_at
  ON revenue_operator.operational_presence_log(sent_at);
