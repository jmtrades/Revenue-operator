-- Recovery aggression profile: conservative | standard | assertive. No UI.

BEGIN;

ALTER TABLE revenue_operator.settings
  ADD COLUMN IF NOT EXISTS recovery_profile text NOT NULL DEFAULT 'standard'
  CHECK (recovery_profile IN ('conservative', 'standard', 'assertive'));

COMMIT;
