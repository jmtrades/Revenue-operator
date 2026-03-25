-- Add trial_end_at and renews_at fields for clearer billing tracking
-- trial_end_at: when trial ends
-- renews_at: when subscription renews (trial_end if trialing, current_period_end if active)

BEGIN;

ALTER TABLE revenue_operator.workspaces
  ADD COLUMN IF NOT EXISTS trial_end_at timestamptz,
  ADD COLUMN IF NOT EXISTS renews_at timestamptz;

-- Migrate existing protection_renewal_at to renews_at (if column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'revenue_operator' 
    AND table_name = 'workspaces' 
    AND column_name = 'protection_renewal_at'
  ) THEN
    UPDATE revenue_operator.workspaces
    SET renews_at = protection_renewal_at
    WHERE renews_at IS NULL AND protection_renewal_at IS NOT NULL;
  END IF;
END $$;

COMMIT;
