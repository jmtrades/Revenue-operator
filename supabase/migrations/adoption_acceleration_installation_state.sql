-- Adoption Acceleration: installation phase (observing → activation_ready → active)
BEGIN;

CREATE TABLE IF NOT EXISTS revenue_operator.workspace_installation_state (
  workspace_id uuid PRIMARY KEY REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  phase text NOT NULL DEFAULT 'observing'
    CHECK (phase IN ('observing', 'activation_ready', 'active')),
  observation_started_at timestamptz,
  activation_at timestamptz,
  snapshot_viewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workspace_installation_state_phase
  ON revenue_operator.workspace_installation_state (phase);

COMMIT;
