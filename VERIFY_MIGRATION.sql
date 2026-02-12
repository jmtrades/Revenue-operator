-- Verification query: Check if all billing fields were added successfully
-- Run this in Supabase SQL Editor to confirm migration worked

SELECT 
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'revenue_operator' 
  AND table_name = 'workspaces'
  AND column_name IN (
    'trial_end_at', 
    'renews_at', 
    'trial_reminder_3d_sent_at', 
    'trial_reminder_24h_sent_at'
  )
ORDER BY column_name;

-- Expected result: 4 rows showing all columns exist with type "timestamp with time zone"
