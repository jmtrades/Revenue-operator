-- Webhook events table for idempotency and reliability
-- Prevents duplicate processing of Stripe webhooks

BEGIN;

CREATE TABLE IF NOT EXISTS revenue_operator.webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL UNIQUE,
  event_type text NOT NULL,
  workspace_id uuid REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  payload jsonb NOT NULL,
  processed boolean DEFAULT false,
  processed_at timestamptz,
  error text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_event_id ON revenue_operator.webhook_events(event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_workspace ON revenue_operator.webhook_events(workspace_id, created_at);

COMMIT;
