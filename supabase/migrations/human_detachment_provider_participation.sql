-- Human detachment evidence: track whether provider touched the situation before resolution.
-- Append-only evidence layer. No decision logic.

CREATE TABLE IF NOT EXISTS revenue_operator.provider_participation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  chain_reference text NOT NULL,
  provider_interacted boolean NOT NULL DEFAULT true,
  first_event_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_provider_participation_workspace_ref
  ON revenue_operator.provider_participation(workspace_id, chain_reference);

CREATE INDEX IF NOT EXISTS idx_provider_participation_workspace_first
  ON revenue_operator.provider_participation(workspace_id, first_event_at DESC);
