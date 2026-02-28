-- Idempotent schema repair: missing tables and columns required by operator.
-- Never drops data or renames destructively. Safe to run multiple times.

BEGIN;

-- Dead letter / failed jobs (message queue safety)
CREATE TABLE IF NOT EXISTS revenue_operator.failed_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES revenue_operator.workspaces(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES revenue_operator.leads(id) ON DELETE SET NULL,
  job_type text NOT NULL,
  payload jsonb DEFAULT '{}',
  error_message text,
  attempt_count integer DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_failed_jobs_created_at
  ON revenue_operator.failed_jobs(created_at);

-- Confidence ceiling: block automatic replies for 10 min after escalate
CREATE TABLE IF NOT EXISTS revenue_operator.lead_action_locks (
  lead_id uuid NOT NULL REFERENCES revenue_operator.leads(id) ON DELETE CASCADE,
  locked_until timestamptz NOT NULL,
  reason text NOT NULL DEFAULT 'confidence_ceiling',
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (lead_id)
);

CREATE INDEX IF NOT EXISTS idx_lead_action_locks_locked_until
  ON revenue_operator.lead_action_locks(locked_until);

-- Indexes for cron and pipeline queries (idempotent; only if table and column exist)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'revenue_operator' AND table_name = 'escalation_logs' AND column_name = 'holding_message_sent'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_escalation_logs_holding_notified
      ON revenue_operator.escalation_logs(holding_message_sent, notified_at)
      WHERE holding_message_sent = true;
  END IF;
END $$;

COMMIT;
