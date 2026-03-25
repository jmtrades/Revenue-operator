-- Dead letter for connector events that fail validation or execution. Append-only; no deletes.

BEGIN;

CREATE TABLE IF NOT EXISTS revenue_operator.connector_events_dead_letter (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  channel text NOT NULL,
  external_id text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}',
  reason text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_connector_events_dead_letter_workspace
  ON revenue_operator.connector_events_dead_letter (workspace_id, received_at DESC);

COMMENT ON TABLE revenue_operator.connector_events_dead_letter IS 'Connector events that failed normalized_inbound validation or execution pipeline. Append-only.';

COMMIT;
