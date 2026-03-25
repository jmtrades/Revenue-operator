-- Economic participation state, activation, and usage meter. No subscriptions, no pricing UI.

BEGIN;

CREATE TABLE IF NOT EXISTS revenue_operator.economic_participation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  participation_reason text NOT NULL CHECK (participation_reason IN (
    'value_generated',
    'value_protected',
    'coordination_dependency'
  )),
  first_detected_at timestamptz NOT NULL,
  last_detected_at timestamptz NOT NULL,
  economic_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, participation_reason)
);
CREATE INDEX IF NOT EXISTS idx_economic_participation_workspace_active
  ON revenue_operator.economic_participation (workspace_id, economic_active);

CREATE TABLE IF NOT EXISTS revenue_operator.economic_activation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  activated_at timestamptz NOT NULL,
  activation_source text NOT NULL CHECK (activation_source IN (
    'recovered_value',
    'network_dependency',
    'protected_outcome'
  )),
  UNIQUE(workspace_id)
);
CREATE INDEX IF NOT EXISTS idx_economic_activation_workspace
  ON revenue_operator.economic_activation (workspace_id);

CREATE TABLE IF NOT EXISTS revenue_operator.economic_usage_meter (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  usage_type text NOT NULL CHECK (usage_type IN (
    'commitments_resolved',
    'payments_recovered',
    'opportunities_revived',
    'shared_entries_created'
  )),
  usage_count integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_economic_usage_meter_workspace_period
  ON revenue_operator.economic_usage_meter (workspace_id, period_start, usage_type);

COMMIT;
