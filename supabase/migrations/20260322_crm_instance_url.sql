-- Add instance_url column to workspace_crm_connections table
-- Required for Salesforce (stores the instance-specific API base URL)
-- and potentially other providers that return instance-specific URLs.

ALTER TABLE revenue_operator.workspace_crm_connections
ADD COLUMN IF NOT EXISTS instance_url text;

COMMENT ON COLUMN revenue_operator.workspace_crm_connections.instance_url IS 'Provider instance URL (e.g. Salesforce instance URL for API calls)';
