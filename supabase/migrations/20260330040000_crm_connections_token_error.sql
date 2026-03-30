-- Add token_error column to revenue_operator.workspace_crm_connections
-- This column was missing, causing PostgREST queries that SELECT token_error to fail silently.
-- The CRM status and system-readiness endpoints depend on this column.

ALTER TABLE revenue_operator.workspace_crm_connections
  ADD COLUMN IF NOT EXISTS token_error text;

COMMENT ON COLUMN revenue_operator.workspace_crm_connections.token_error
  IS 'Stores the last OAuth token refresh error message, if any. NULL means no error.';
