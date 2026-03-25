-- Daily assurance email state: one row per workspace, last sent UTC date.

CREATE TABLE IF NOT EXISTS revenue_operator.assurance_delivery_state (
  workspace_id uuid PRIMARY KEY REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  last_sent_utc_date date NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now()
);
