BEGIN;

ALTER TABLE revenue_operator.workspaces
  ADD COLUMN IF NOT EXISTS industry text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz;

COMMENT ON COLUMN revenue_operator.workspaces.industry IS 'Primary industry selected during onboarding/settings.';
COMMENT ON COLUMN revenue_operator.workspaces.website IS 'Public website used for onboarding and agent context.';
COMMENT ON COLUMN revenue_operator.workspaces.address IS 'Business address used for agent answers and local service context.';
COMMENT ON COLUMN revenue_operator.workspaces.onboarding_completed_at IS 'Set when the app onboarding flow is completed.';

COMMIT;
