-- Human-readable incident statements (value perception, no analytics)
BEGIN;

CREATE TABLE IF NOT EXISTS revenue_operator.incident_statements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  category text NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  related_external_ref text
);

CREATE INDEX IF NOT EXISTS idx_incident_statements_workspace_created
  ON revenue_operator.incident_statements (workspace_id, created_at DESC);

COMMIT;
