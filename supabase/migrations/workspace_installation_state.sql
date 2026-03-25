-- Installation gating: align workspace_installation_state with spec columns.
-- Run after adoption_acceleration_installation_state (or any migration that creates workspace_installation_state).

BEGIN;

-- Ensure table exists with full spec (idempotent for fresh installs)
CREATE TABLE IF NOT EXISTS revenue_operator.workspace_installation_state (
  workspace_id uuid PRIMARY KEY REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  phase text NOT NULL DEFAULT 'observing'
    CHECK (phase IN ('observing', 'activation_ready', 'active')),
  observation_started_at timestamptz DEFAULT now(),
  activation_ready_at timestamptz,
  activated_at timestamptz,
  snapshot_generated_at timestamptz,
  snapshot_seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add columns if missing (when table already existed with old schema)
ALTER TABLE revenue_operator.workspace_installation_state ADD COLUMN IF NOT EXISTS activation_ready_at timestamptz;
ALTER TABLE revenue_operator.workspace_installation_state ADD COLUMN IF NOT EXISTS snapshot_generated_at timestamptz;
ALTER TABLE revenue_operator.workspace_installation_state ADD COLUMN IF NOT EXISTS activated_at timestamptz;
ALTER TABLE revenue_operator.workspace_installation_state ADD COLUMN IF NOT EXISTS snapshot_seen_at timestamptz;

-- Migrate data from old column names if present
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'revenue_operator' AND table_name = 'workspace_installation_state' AND column_name = 'activation_at') THEN
    UPDATE revenue_operator.workspace_installation_state SET activated_at = activation_at WHERE activated_at IS NULL AND activation_at IS NOT NULL;
    ALTER TABLE revenue_operator.workspace_installation_state DROP COLUMN IF EXISTS activation_at;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'revenue_operator' AND table_name = 'workspace_installation_state' AND column_name = 'snapshot_viewed_at') THEN
    UPDATE revenue_operator.workspace_installation_state SET snapshot_seen_at = snapshot_viewed_at WHERE snapshot_seen_at IS NULL AND snapshot_viewed_at IS NOT NULL;
    ALTER TABLE revenue_operator.workspace_installation_state DROP COLUMN IF EXISTS snapshot_viewed_at;
  END IF;
END $$;

ALTER TABLE revenue_operator.workspace_installation_state ALTER COLUMN observation_started_at SET DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_workspace_installation_state_phase ON revenue_operator.workspace_installation_state (phase);
CREATE INDEX IF NOT EXISTS idx_workspace_installation_state_observation_started ON revenue_operator.workspace_installation_state (observation_started_at);
CREATE INDEX IF NOT EXISTS idx_workspace_installation_state_workspace_id ON revenue_operator.workspace_installation_state (workspace_id);

COMMIT;
