-- ============================================
-- LAUNCH BILLING FIELDS MIGRATION
-- ============================================
-- Copy this entire file and run in Supabase SQL Editor
-- URL: https://supabase.com/dashboard/project/ucjbsftixnnbmuodholg/sql
-- ============================================

BEGIN;

-- Add trial_end_at and renews_at fields for clearer billing tracking
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

-- Add trial reminder sent tracking fields
ALTER TABLE revenue_operator.workspaces
  ADD COLUMN IF NOT EXISTS trial_reminder_3d_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS trial_reminder_24h_sent_at timestamptz;

COMMIT;

-- ============================================
-- VERIFICATION QUERY (run separately after migration)
-- ============================================
-- SELECT 
--   column_name, 
--   data_type 
-- FROM information_schema.columns 
-- WHERE table_schema = 'revenue_operator' 
--   AND table_name = 'workspaces'
--   AND column_name IN ('trial_end_at', 'renews_at', 'trial_reminder_3d_sent_at', 'trial_reminder_24h_sent_at');
