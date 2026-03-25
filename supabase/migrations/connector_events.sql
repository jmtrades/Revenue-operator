-- Connector events: normalized ingest from all channels (email, CRM, calendar, forms, etc.).
-- Connectors emit only; all logic remains centralized. Events map into Work Units, not bypass.

BEGIN;

CREATE TABLE IF NOT EXISTS revenue_operator.connector_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  channel text NOT NULL,
  external_id text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}',
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  work_unit_id uuid
);

CREATE INDEX IF NOT EXISTS idx_connector_events_workspace_received
  ON revenue_operator.connector_events (workspace_id, received_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_connector_events_dedup
  ON revenue_operator.connector_events (workspace_id, channel, external_id);

COMMENT ON TABLE revenue_operator.connector_events IS 'Normalized events from connectors. No logic in connectors; central layer maps to work units.';

COMMIT;
