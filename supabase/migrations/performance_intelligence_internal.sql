-- Layer 9: Performance intelligence. Internal-only; no dashboards, no persuasion metrics.

BEGIN;

CREATE TABLE IF NOT EXISTS revenue_operator.strategy_state_success_rate (
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  domain_type text NOT NULL,
  state_from text NOT NULL,
  state_to text NOT NULL,
  transition_count int NOT NULL DEFAULT 0,
  success_count int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, domain_type, state_from, state_to)
);

CREATE TABLE IF NOT EXISTS revenue_operator.objection_resolution_rate (
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  domain_type text NOT NULL,
  objection_tag text NOT NULL,
  attempt_count int NOT NULL DEFAULT 0,
  resolved_count int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, domain_type, objection_tag)
);

CREATE TABLE IF NOT EXISTS revenue_operator.escalation_success_rate (
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  channel_from text NOT NULL,
  channel_to text NOT NULL,
  attempt_count int NOT NULL DEFAULT 0,
  success_count int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, channel_from, channel_to)
);

COMMENT ON TABLE revenue_operator.strategy_state_success_rate IS 'Internal tuning only. Not shown as growth metrics.';
COMMENT ON TABLE revenue_operator.objection_resolution_rate IS 'Internal tuning only.';
COMMENT ON TABLE revenue_operator.escalation_success_rate IS 'Internal tuning only.';

COMMIT;
