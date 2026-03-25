-- Continuity load: internal accounting for infrastructure billing. Never exposed to UI.
CREATE TABLE IF NOT EXISTS revenue_operator.continuity_load_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  load_type text NOT NULL CHECK (load_type IN (
    'expectation_maintained',
    'continuation_prevented',
    'outcome_caused',
    'coordination_displaced',
    'operation_sustained',
    'assumption_relied',
    'normalized_operation',
    'protection_interrupted'
  )),
  reference_id text NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_continuity_load_events_dedupe
  ON revenue_operator.continuity_load_events (workspace_id, load_type, reference_id);

CREATE INDEX IF NOT EXISTS idx_continuity_load_events_workspace_recorded
  ON revenue_operator.continuity_load_events (workspace_id, recorded_at DESC);
