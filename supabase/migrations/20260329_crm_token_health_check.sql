-- Add token health check columns to workspace_crm_connections
-- Task: Track token expiration and refresh failures for proper error handling

ALTER TABLE revenue_operator.workspace_crm_connections
ADD COLUMN IF NOT EXISTS token_expires_at timestamptz,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'expired', 'expiring_soon', 'error')),
ADD COLUMN IF NOT EXISTS token_error text,
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';

COMMENT ON COLUMN revenue_operator.workspace_crm_connections.token_expires_at IS 'OAuth access token expiration timestamp';
COMMENT ON COLUMN revenue_operator.workspace_crm_connections.status IS 'Connection status: active, inactive, expired, expiring_soon, or error';
COMMENT ON COLUMN revenue_operator.workspace_crm_connections.token_error IS 'Error message from last token refresh attempt';
COMMENT ON COLUMN revenue_operator.workspace_crm_connections.metadata IS 'Additional integration metadata';

-- Add action type for token refresh failures in sync_log
ALTER TABLE revenue_operator.sync_log
DROP CONSTRAINT IF EXISTS sync_log_action_check,
ADD CONSTRAINT sync_log_action_check CHECK (action IN ('created', 'updated', 'failed', 'conflict', 'skipped', 'token_refresh_failed'));
