-- Day 3 nudge email tracking
ALTER TABLE revenue_operator.workspaces
  ADD COLUMN IF NOT EXISTS day_3_email_sent_at timestamptz;
