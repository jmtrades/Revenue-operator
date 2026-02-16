-- Proof capsules: period-based lines for value proof. No metrics.

BEGIN;

CREATE TABLE IF NOT EXISTS revenue_operator.proof_capsules (
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  lines jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, period_end)
);

CREATE INDEX IF NOT EXISTS idx_proof_capsules_workspace_period
  ON revenue_operator.proof_capsules(workspace_id, period_end DESC);

COMMIT;
