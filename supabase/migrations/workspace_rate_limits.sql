-- Workspace rate ceilings: outbound and voice per hour.
-- Configuration only; enforcement happens in execution-plan emit. No metrics exposed.

BEGIN;

CREATE TABLE IF NOT EXISTS revenue_operator.workspace_rate_limits (
  workspace_id uuid PRIMARY KEY REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  max_outbound_per_hour integer NOT NULL CHECK (max_outbound_per_hour > 0),
  max_voice_per_hour integer NOT NULL CHECK (max_voice_per_hour > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE revenue_operator.workspace_rate_limits IS 'Per-workspace ceilings for governed execution; enforced in execution-plan. No UI metrics.';

COMMIT;

