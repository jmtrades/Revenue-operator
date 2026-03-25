-- Operational realization events: first-time adoption milestones. One row per type per workspace.
CREATE TABLE IF NOT EXISTS revenue_operator.operational_realization_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  realization_type text NOT NULL CHECK (realization_type IN (
    'first_prevented_failure',
    'first_continuation_stopped',
    'first_external_acknowledgement',
    'first_detachment_detected',
    'first_normalized_operation'
  )),
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_operational_realization_events_workspace_type
  ON revenue_operator.operational_realization_events (workspace_id, realization_type);
