-- Dead-letter table for failed webhook deliveries.
-- Allows manual retry and monitoring of CRM sync failures.

CREATE TABLE IF NOT EXISTS revenue_operator.webhook_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  url text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'failed' CHECK (status IN ('failed', 'retried', 'resolved')),
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_workspace
  ON revenue_operator.webhook_deliveries(workspace_id, status);
