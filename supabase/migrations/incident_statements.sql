-- Incident statements: human-readable value perception. Dedupe by workspace, category, ref, day.
BEGIN;

CREATE TABLE IF NOT EXISTS revenue_operator.incident_statements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  category text NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  related_external_ref text
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_incident_statements_dedupe
  ON revenue_operator.incident_statements (workspace_id, category, COALESCE(related_external_ref, ''), (CAST(created_at AT TIME ZONE 'UTC' AS date)));

CREATE INDEX IF NOT EXISTS idx_incident_statements_workspace_created
  ON revenue_operator.incident_statements (workspace_id, created_at DESC);

COMMIT;
