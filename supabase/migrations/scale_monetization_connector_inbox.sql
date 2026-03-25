-- Connector inbox: append-only events from external systems. Signal consumer cron maps to canonical signals.
-- No business logic in connectors; mapping in cron only.

CREATE TABLE IF NOT EXISTS revenue_operator.connector_inbox_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  kind text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}',
  occurred_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_connector_inbox_events_workspace_occurred
  ON revenue_operator.connector_inbox_events(workspace_id, occurred_at);

-- Processed state kept separate to preserve append-only inbox.
CREATE TABLE IF NOT EXISTS revenue_operator.connector_inbox_event_state (
  id uuid PRIMARY KEY REFERENCES revenue_operator.connector_inbox_events(id) ON DELETE CASCADE,
  processed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_connector_inbox_event_state_processed
  ON revenue_operator.connector_inbox_event_state(id);
