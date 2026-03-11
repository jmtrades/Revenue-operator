-- integration_configs: store CRM field mapping and other integration config per workspace/provider (Task 18).

CREATE TABLE IF NOT EXISTS revenue_operator.integration_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN (
    'salesforce', 'hubspot', 'zoho_crm', 'pipedrive', 'gohighlevel', 'google_contacts', 'microsoft_365'
  )),
  config_type text NOT NULL DEFAULT 'field_mapping' CHECK (config_type IN ('field_mapping', 'sync_options')),
  config jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, provider, config_type)
);

CREATE INDEX IF NOT EXISTS idx_integration_configs_workspace_provider
  ON revenue_operator.integration_configs(workspace_id, provider);

ALTER TABLE revenue_operator.integration_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_isolation_integration_configs"
  ON revenue_operator.integration_configs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM revenue_operator.workspaces w
      WHERE w.id = integration_configs.workspace_id
      AND (w.owner_id = auth.uid() OR EXISTS (
        SELECT 1 FROM revenue_operator.workspace_members wm
        WHERE wm.workspace_id = w.id AND wm.user_id = auth.uid()
      ))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM revenue_operator.workspaces w
      WHERE w.id = integration_configs.workspace_id
      AND (w.owner_id = auth.uid() OR EXISTS (
        SELECT 1 FROM revenue_operator.workspace_members wm
        WHERE wm.workspace_id = w.id AND wm.user_id = auth.uid()
      ))
    )
  );

COMMENT ON TABLE revenue_operator.integration_configs IS 'CRM field mapping and sync config. config_type=field_mapping stores mappings array.';
