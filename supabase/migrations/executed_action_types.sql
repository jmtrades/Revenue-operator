-- Executed action types: first execution per workspace + action_type for preview lifecycle.
BEGIN;

CREATE TABLE IF NOT EXISTS revenue_operator.executed_action_types (
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  first_executed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, action_type)
);

COMMIT;
