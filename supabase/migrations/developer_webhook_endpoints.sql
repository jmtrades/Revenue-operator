-- Developer webhook endpoints (multiple per workspace) and delivery log (Task 21).

BEGIN;

CREATE TABLE IF NOT EXISTS revenue_operator.developer_webhook_endpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  url text NOT NULL,
  secret text,
  events text[] NOT NULL DEFAULT '{}',
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_developer_webhook_endpoints_workspace
  ON revenue_operator.developer_webhook_endpoints(workspace_id);

CREATE TABLE IF NOT EXISTS revenue_operator.developer_webhook_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_id uuid NOT NULL REFERENCES revenue_operator.developer_webhook_endpoints(id) ON DELETE CASCADE,
  event text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}',
  response_status int,
  response_time_ms int,
  success boolean NOT NULL DEFAULT false,
  retry_count int NOT NULL DEFAULT 0,
  next_retry_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_developer_webhook_deliveries_endpoint
  ON revenue_operator.developer_webhook_deliveries(endpoint_id);
CREATE INDEX IF NOT EXISTS idx_developer_webhook_deliveries_created
  ON revenue_operator.developer_webhook_deliveries(created_at DESC);

ALTER TABLE revenue_operator.developer_webhook_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_operator.developer_webhook_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "developer_webhook_endpoints_select" ON revenue_operator.developer_webhook_endpoints;
CREATE POLICY "developer_webhook_endpoints_select" ON revenue_operator.developer_webhook_endpoints FOR SELECT USING (revenue_operator.workspace_owner_check(workspace_id));
DROP POLICY IF EXISTS "developer_webhook_endpoints_insert" ON revenue_operator.developer_webhook_endpoints;
CREATE POLICY "developer_webhook_endpoints_insert" ON revenue_operator.developer_webhook_endpoints FOR INSERT WITH CHECK (revenue_operator.workspace_owner_check(workspace_id));
DROP POLICY IF EXISTS "developer_webhook_endpoints_update" ON revenue_operator.developer_webhook_endpoints;
CREATE POLICY "developer_webhook_endpoints_update" ON revenue_operator.developer_webhook_endpoints FOR UPDATE USING (revenue_operator.workspace_owner_check(workspace_id));
DROP POLICY IF EXISTS "developer_webhook_endpoints_delete" ON revenue_operator.developer_webhook_endpoints;
CREATE POLICY "developer_webhook_endpoints_delete" ON revenue_operator.developer_webhook_endpoints FOR DELETE USING (revenue_operator.workspace_owner_check(workspace_id));

DROP POLICY IF EXISTS "developer_webhook_deliveries_select" ON revenue_operator.developer_webhook_deliveries;
CREATE POLICY "developer_webhook_deliveries_select" ON revenue_operator.developer_webhook_deliveries FOR SELECT USING (
  EXISTS (SELECT 1 FROM revenue_operator.developer_webhook_endpoints e WHERE e.id = endpoint_id AND revenue_operator.workspace_owner_check(e.workspace_id))
);
DROP POLICY IF EXISTS "developer_webhook_deliveries_insert" ON revenue_operator.developer_webhook_deliveries;
CREATE POLICY "developer_webhook_deliveries_insert" ON revenue_operator.developer_webhook_deliveries FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM revenue_operator.developer_webhook_endpoints e WHERE e.id = endpoint_id AND revenue_operator.workspace_owner_check(e.workspace_id))
);
DROP POLICY IF EXISTS "developer_webhook_deliveries_update" ON revenue_operator.developer_webhook_deliveries;
CREATE POLICY "developer_webhook_deliveries_update" ON revenue_operator.developer_webhook_deliveries FOR UPDATE USING (
  EXISTS (SELECT 1 FROM revenue_operator.developer_webhook_endpoints e WHERE e.id = endpoint_id AND revenue_operator.workspace_owner_check(e.workspace_id))
);

COMMIT;
