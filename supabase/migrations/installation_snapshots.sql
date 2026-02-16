-- Installation snapshots: store generated snapshot text per workspace.
BEGIN;

CREATE TABLE IF NOT EXISTS revenue_operator.installation_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  snapshot_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_installation_snapshots_workspace_created
  ON revenue_operator.installation_snapshots (workspace_id, created_at DESC);

COMMIT;
