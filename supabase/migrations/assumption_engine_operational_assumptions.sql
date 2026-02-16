-- Assumption engine: deterministic behavioral reliance (outcome presumed, dependency action, absence-only attention).

CREATE TABLE IF NOT EXISTS revenue_operator.operational_assumptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  assumption_type text NOT NULL CHECK (assumption_type IN (
    'outcome_presumed',
    'dependency_action_taken',
    'absence_only_attention'
  )),
  reference_id text NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_operational_assumptions_workspace_recorded
  ON revenue_operator.operational_assumptions(workspace_id, recorded_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_operational_assumptions_daily_dedupe
  ON revenue_operator.operational_assumptions(
    workspace_id,
    assumption_type,
    reference_id,
    ((recorded_at AT TIME ZONE 'UTC')::date)
  );

ALTER TABLE revenue_operator.workspace_orientation_state
  ADD COLUMN IF NOT EXISTS assumption_orientation_recorded_at timestamptz;
