-- Continuity Environment: shadow execution, dependency memory, environment density, settlement understood.
-- Doctrine: operational infrastructure only.

BEGIN;

-- Shadow execution: when confidence gate blocks (observing/simulating), record what would have happened.
CREATE TABLE IF NOT EXISTS revenue_operator.shadow_execution_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  would_have_executed_at timestamptz NOT NULL DEFAULT now(),
  prevented_reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_shadow_execution_log_workspace
  ON revenue_operator.shadow_execution_log(workspace_id);

-- Dependency memory: repeated relief/orientation by type.
CREATE TABLE IF NOT EXISTS revenue_operator.operational_dependency_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  dependency_type text NOT NULL CHECK (dependency_type IN (
    'followup_tracking',
    'payment_followthrough',
    'commitment_resolution',
    'shared_confirmation'
  )),
  first_observed_at timestamptz NOT NULL DEFAULT now(),
  last_observed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, dependency_type)
);
CREATE INDEX IF NOT EXISTS idx_operational_dependency_memory_workspace
  ON revenue_operator.operational_dependency_memory(workspace_id);

-- Cross-workspace: how many external participants interacted in window.
CREATE TABLE IF NOT EXISTS revenue_operator.shared_environment_density (
  workspace_id uuid PRIMARY KEY REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  external_participants_count int NOT NULL DEFAULT 0,
  last_updated_at timestamptz NOT NULL DEFAULT now()
);

-- Settlement understood: set when dependence booleans true and if-removed non-empty.
ALTER TABLE revenue_operator.workspace_orientation_state
  ADD COLUMN IF NOT EXISTS settlement_understood boolean DEFAULT false;

COMMIT;
