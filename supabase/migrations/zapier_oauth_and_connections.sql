-- Zapier OAuth one-time codes and connections (Task 22).

BEGIN;

CREATE TABLE IF NOT EXISTS revenue_operator.zapier_oauth_codes (
  code text PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  redirect_uri text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_zapier_oauth_codes_workspace
  ON revenue_operator.zapier_oauth_codes(workspace_id);

CREATE TABLE IF NOT EXISTS revenue_operator.zapier_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  access_token text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_zapier_connections_workspace
  ON revenue_operator.zapier_connections(workspace_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_zapier_connections_access_token
  ON revenue_operator.zapier_connections(access_token);

ALTER TABLE revenue_operator.zapier_oauth_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_operator.zapier_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "zapier_oauth_codes_all" ON revenue_operator.zapier_oauth_codes;
CREATE POLICY "zapier_oauth_codes_all" ON revenue_operator.zapier_oauth_codes FOR ALL
  USING (revenue_operator.workspace_owner_check(workspace_id))
  WITH CHECK (revenue_operator.workspace_owner_check(workspace_id));

DROP POLICY IF EXISTS "zapier_connections_all" ON revenue_operator.zapier_connections;
CREATE POLICY "zapier_connections_all" ON revenue_operator.zapier_connections FOR ALL
  USING (revenue_operator.workspace_owner_check(workspace_id))
  WITH CHECK (revenue_operator.workspace_owner_check(workspace_id));

COMMIT;
