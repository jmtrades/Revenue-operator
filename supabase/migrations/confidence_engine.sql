-- Confidence Engine: phases, simulated actions, trusted action types, operational narrative.
-- Additive only; no existing schema changes except new column.

BEGIN;

-- confidence_phase on workspace_installation_state (default observing)
ALTER TABLE revenue_operator.workspace_installation_state
  ADD COLUMN IF NOT EXISTS confidence_phase text NOT NULL DEFAULT 'observing'
  CHECK (confidence_phase IN ('observing', 'simulating', 'assisted', 'autonomous'));

CREATE INDEX IF NOT EXISTS idx_workspace_installation_state_confidence_phase
  ON revenue_operator.workspace_installation_state (confidence_phase);

-- simulated_actions: engines compute but do not send in simulating phase
CREATE TABLE IF NOT EXISTS revenue_operator.simulated_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  related_external_ref text,
  simulated_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_simulated_actions_workspace_created
  ON revenue_operator.simulated_actions (workspace_id, created_at DESC);

-- trusted_action_types: after first approval in assisted phase
CREATE TABLE IF NOT EXISTS revenue_operator.trusted_action_types (
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  trusted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, action_type)
);

-- operational_narrative: chronological plain-language stream
CREATE TABLE IF NOT EXISTS revenue_operator.operational_narrative (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  entry_type text NOT NULL,
  text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_operational_narrative_workspace_created
  ON revenue_operator.operational_narrative (workspace_id, created_at DESC);

COMMIT;
