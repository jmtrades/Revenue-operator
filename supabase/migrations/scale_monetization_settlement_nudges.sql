-- Settlement nudges: unconfigured reminder throttle (once per 3 days).

CREATE TABLE IF NOT EXISTS revenue_operator.settlement_nudges (
  workspace_id uuid PRIMARY KEY REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  last_unconfigured_sent_at date
);
