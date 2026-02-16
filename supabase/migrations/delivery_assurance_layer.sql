-- Phase 2: Delivery Assurance Layer — no message or escalation may fail silently.

BEGIN;

-- 1. Action delivery lifecycle: one row per send attempt; complete only when provider confirms.
CREATE TABLE IF NOT EXISTS revenue_operator.action_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_command_id uuid NOT NULL REFERENCES revenue_operator.action_commands(id) ON DELETE CASCADE,
  attempt_number integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sending', 'delivered', 'acknowledged', 'failed')),
  provider_message_id text,
  outbound_message_id uuid,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  next_retry_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_action_attempts_action_command
  ON revenue_operator.action_attempts(action_command_id);
CREATE INDEX IF NOT EXISTS idx_action_attempts_provider_message_id
  ON revenue_operator.action_attempts(provider_message_id)
  WHERE provider_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_action_attempts_next_retry
  ON revenue_operator.action_attempts(next_retry_at)
  WHERE next_retry_at IS NOT NULL;

-- 2. Handoff acknowledgement: notifications repeat until acknowledged.
CREATE TABLE IF NOT EXISTS revenue_operator.handoff_acknowledgements (
  escalation_id uuid NOT NULL PRIMARY KEY REFERENCES revenue_operator.escalation_logs(id) ON DELETE CASCADE,
  acknowledged_by text,
  acknowledged_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Queue guarantees: claim before execution; expired claim may be reclaimed.
CREATE TABLE IF NOT EXISTS revenue_operator.job_claims (
  job_id uuid NOT NULL PRIMARY KEY REFERENCES revenue_operator.job_queue(id) ON DELETE CASCADE,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  worker_id text NOT NULL,
  expires_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_job_claims_expires_at
  ON revenue_operator.job_claims(expires_at);

-- 4. failed_jobs: add stage for DLQ (signal | state | decision | action)
ALTER TABLE revenue_operator.failed_jobs
  ADD COLUMN IF NOT EXISTS stage text;

COMMIT;
