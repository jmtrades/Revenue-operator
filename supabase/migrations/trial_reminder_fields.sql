-- Add trial reminder sent tracking fields

BEGIN;

ALTER TABLE revenue_operator.workspaces
  ADD COLUMN IF NOT EXISTS trial_reminder_3d_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS trial_reminder_24h_sent_at timestamptz;

COMMIT;
