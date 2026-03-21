-- Add OAuth token columns to workspace_crm_connections table
-- Task 1: Support storing CRM OAuth tokens for callback handling

ALTER TABLE revenue_operator.workspace_crm_connections
ADD COLUMN IF NOT EXISTS access_token text,
ADD COLUMN IF NOT EXISTS refresh_token text,
ADD COLUMN IF NOT EXISTS expires_at timestamptz;

COMMENT ON COLUMN revenue_operator.workspace_crm_connections.access_token IS 'OAuth access token for CRM integration';
COMMENT ON COLUMN revenue_operator.workspace_crm_connections.refresh_token IS 'OAuth refresh token for CRM integration';
COMMENT ON COLUMN revenue_operator.workspace_crm_connections.expires_at IS 'Expiration timestamp for OAuth access token';
