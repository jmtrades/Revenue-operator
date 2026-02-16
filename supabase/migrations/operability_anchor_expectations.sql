-- Operability anchor: situations maintained by the process. Present-state only.

CREATE TABLE IF NOT EXISTS revenue_operator.active_operational_expectations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  expectation_type text NOT NULL CHECK (expectation_type IN (
    'awaiting_reply',
    'awaiting_confirmation',
    'awaiting_payment',
    'awaiting_counterparty'
  )),
  reference_id text NOT NULL,
  maintained_by_system boolean NOT NULL DEFAULT false,
  first_observed_at timestamptz NOT NULL DEFAULT now(),
  last_observed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, expectation_type, reference_id)
);

CREATE INDEX IF NOT EXISTS idx_active_operational_expectations_workspace
  ON revenue_operator.active_operational_expectations(workspace_id);

CREATE INDEX IF NOT EXISTS idx_active_operational_expectations_last_observed
  ON revenue_operator.active_operational_expectations(workspace_id, last_observed_at DESC);
