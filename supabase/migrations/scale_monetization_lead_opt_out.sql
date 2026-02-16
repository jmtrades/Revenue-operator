-- Lead opt-out: STOP/UNSUBSCRIBE. Action worker checks before send.

CREATE TABLE IF NOT EXISTS revenue_operator.lead_opt_out (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  counterparty_identifier text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, counterparty_identifier)
);

CREATE INDEX IF NOT EXISTS idx_lead_opt_out_workspace
  ON revenue_operator.lead_opt_out(workspace_id);
