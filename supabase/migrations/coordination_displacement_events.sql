-- Coordination displacement: people act without asking each other because the system contains the answer.

BEGIN;

CREATE TABLE IF NOT EXISTS revenue_operator.coordination_displacement_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  actor_type text NOT NULL CHECK (actor_type IN ('staff', 'customer', 'counterparty')),
  decision_type text NOT NULL CHECK (decision_type IN ('attendance', 'payment', 'responsibility', 'confirmation', 'continuation')),
  relied_on_environment boolean NOT NULL DEFAULT true,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coordination_displacement_workspace_recorded
  ON revenue_operator.coordination_displacement_events(workspace_id, recorded_at DESC);

COMMIT;
