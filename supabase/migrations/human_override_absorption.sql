-- Human override absorption: track when human acted before we notified.

BEGIN;

-- Part 1: mark escalation as resolved by human before we sent handoff notice
ALTER TABLE revenue_operator.escalation_logs
  ADD COLUMN IF NOT EXISTS resolved_by_human_pre_notice boolean DEFAULT false;

-- Part 6: "All set." once per day when no coordination signal was sent and humans resolved all
CREATE TABLE IF NOT EXISTS revenue_operator.all_set_sent (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  sent_local_date text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, sent_local_date)
);

COMMIT;
