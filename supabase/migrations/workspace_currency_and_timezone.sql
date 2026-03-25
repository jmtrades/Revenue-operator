-- Phase 1: workspace currency and timezone for global readiness
-- Add currency (Task 3) and timezone (Task 8) to workspaces

ALTER TABLE revenue_operator.workspaces
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'USD';

ALTER TABLE revenue_operator.workspaces
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'America/New_York';

COMMENT ON COLUMN revenue_operator.workspaces.currency IS 'ISO 4217 currency code for display and billing';
COMMENT ON COLUMN revenue_operator.workspaces.timezone IS 'IANA timezone for scheduling and display';
