-- CRM integration connection status per workspace (Task 17).
-- OAuth tokens stored elsewhere or in vault; this table tracks connection and sync state.

CREATE TABLE IF NOT EXISTS revenue_operator.workspace_crm_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN (
    'salesforce', 'hubspot', 'zoho_crm', 'pipedrive', 'gohighlevel', 'google_contacts', 'microsoft_365'
  )),
  connected_at timestamptz,
  last_sync_at timestamptz,
  records_synced integer NOT NULL DEFAULT 0,
  sync_errors integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_workspace_crm_connections_workspace
  ON revenue_operator.workspace_crm_connections(workspace_id);

ALTER TABLE revenue_operator.workspace_crm_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_isolation_crm_connections"
  ON revenue_operator.workspace_crm_connections
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM revenue_operator.workspaces w
      WHERE w.id = workspace_crm_connections.workspace_id
      AND (w.owner_id = auth.uid() OR EXISTS (
        SELECT 1 FROM revenue_operator.workspace_members wm
        WHERE wm.workspace_id = w.id AND wm.user_id = auth.uid()
      ))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM revenue_operator.workspaces w
      WHERE w.id = workspace_crm_connections.workspace_id
      AND (w.owner_id = auth.uid() OR EXISTS (
        SELECT 1 FROM revenue_operator.workspace_members wm
        WHERE wm.workspace_id = w.id AND wm.user_id = auth.uid()
      ))
    )
  );

COMMENT ON TABLE revenue_operator.workspace_crm_connections IS 'CRM integration connection and sync status per workspace. Used by integrations hub.';
