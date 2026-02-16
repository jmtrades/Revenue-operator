-- Outbound suppression: prevent engines from double-nudging. Unique per workspace, counterparty, key.

CREATE TABLE IF NOT EXISTS revenue_operator.outbound_suppression (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  counterparty_identifier text NOT NULL,
  suppression_key text NOT NULL,
  suppressed_until timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, counterparty_identifier, suppression_key)
);

CREATE INDEX IF NOT EXISTS idx_outbound_suppression_workspace_counterparty
  ON revenue_operator.outbound_suppression(workspace_id, counterparty_identifier);
