-- Non-participation: outcome completed without provider involvement.

CREATE TABLE IF NOT EXISTS revenue_operator.non_participation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  reference_id text NOT NULL,
  subject_type text NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_non_participation_workspace_recorded
  ON revenue_operator.non_participation_events(workspace_id, recorded_at DESC);
