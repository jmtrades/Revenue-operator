-- Dedupe: do not send more than one authorization message per workspace within 7 days.

BEGIN;

CREATE TABLE IF NOT EXISTS revenue_operator.settlement_authorization_sends (
  workspace_id uuid PRIMARY KEY REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  last_sent_at timestamptz NOT NULL
);

COMMIT;
