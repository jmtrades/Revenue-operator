-- Reliability: doctrine violations log, per-lead lock, action retry, proof idempotency
-- This version creates action_commands if it doesn't exist

BEGIN;

-- Ensure action_commands table exists (from doctrine_processed_at_and_action_commands.sql)
CREATE TABLE IF NOT EXISTS revenue_operator.action_commands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dedup_key text NOT NULL UNIQUE,
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES revenue_operator.leads(id) ON DELETE CASCADE,
  type text NOT NULL
    CHECK (type IN ('SendMessage','ScheduleFollowup','SendReminder','RecoverNoShow','ReactivateLead')),
  payload jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_action_commands_dedup_key
  ON revenue_operator.action_commands (dedup_key);
CREATE INDEX IF NOT EXISTS idx_action_commands_pending
  ON revenue_operator.action_commands (workspace_id, created_at)
  WHERE processed_at IS NULL;

-- Ensure canonical_signals exists (from canonical_signals_and_proof.sql)
CREATE TABLE IF NOT EXISTS revenue_operator.canonical_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES revenue_operator.leads(id) ON DELETE CASCADE,
  signal_type text NOT NULL
    CHECK (signal_type IN (
      'InboundMessageReceived','OutboundMessageSent','BookingCreated','BookingCancelled',
      'AppointmentStarted','AppointmentCompleted','AppointmentMissed','PaymentCaptured',
      'CustomerReplied','CustomerInactiveTimeout'
    )),
  idempotency_key text NOT NULL UNIQUE,
  payload jsonb NOT NULL DEFAULT '{}',
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_canonical_signals_workspace_lead_occurred
  ON revenue_operator.canonical_signals (workspace_id, lead_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_canonical_signals_idempotency
  ON revenue_operator.canonical_signals (idempotency_key);
ALTER TABLE revenue_operator.canonical_signals
  ADD COLUMN IF NOT EXISTS processed_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_canonical_signals_processed_at
  ON revenue_operator.canonical_signals (processed_at)
  WHERE processed_at IS NULL;

-- Ensure revenue_proof exists (from canonical_signals_and_proof.sql)
CREATE TABLE IF NOT EXISTS revenue_operator.revenue_proof (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES revenue_operator.leads(id) ON DELETE CASCADE,
  proof_type text NOT NULL
    CHECK (proof_type IN (
      'LeadReceived','RecoveredNoShow','NewBooking','SavedConversation','ReactivatedCustomer','RepeatVisit'
    )),
  operator_id text,
  signal_id uuid REFERENCES revenue_operator.canonical_signals(id) ON DELETE SET NULL,
  state_before text,
  state_after text,
  payload jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_revenue_proof_workspace_type_created
  ON revenue_operator.revenue_proof (workspace_id, proof_type, created_at);
CREATE INDEX IF NOT EXISTS idx_revenue_proof_lead
  ON revenue_operator.revenue_proof (lead_id, created_at);

-- 1. Doctrine violations (when DOCTRINE_ENFORCED=1 and legacy path is hit)
CREATE TABLE IF NOT EXISTS revenue_operator.doctrine_violations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type text NOT NULL,
  job_id text,
  message text NOT NULL,
  detail text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_doctrine_violations_created ON revenue_operator.doctrine_violations(created_at);

-- 2. Per-lead processing lock + last_signal_occurred_at
ALTER TABLE revenue_operator.leads
  ADD COLUMN IF NOT EXISTS signal_processing_lock_until timestamptz;
ALTER TABLE revenue_operator.leads
  ADD COLUMN IF NOT EXISTS last_signal_occurred_at timestamptz;

-- 3. Action commands retry semantics
ALTER TABLE revenue_operator.action_commands
  ADD COLUMN IF NOT EXISTS attempt_count integer NOT NULL DEFAULT 0;
ALTER TABLE revenue_operator.action_commands
  ADD COLUMN IF NOT EXISTS last_error text;
ALTER TABLE revenue_operator.action_commands
  ADD COLUMN IF NOT EXISTS next_retry_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_action_commands_retry
  ON revenue_operator.action_commands (next_retry_at)
  WHERE processed_at IS NULL AND next_retry_at IS NOT NULL;

-- 4. Proof idempotency: dedup_key unique (no double count on replay)
ALTER TABLE revenue_operator.revenue_proof
  ADD COLUMN IF NOT EXISTS proof_dedup_key text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_revenue_proof_dedup_key
  ON revenue_operator.revenue_proof (proof_dedup_key)
  WHERE proof_dedup_key IS NOT NULL;

-- 5. Message insert idempotency: unique (conversation_id, external_id) when external_id not null
-- (Postgres unique treats NULLs as distinct; so only one row per (conv, external_id) when set)
CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_conversation_external_id
  ON revenue_operator.messages (conversation_id, external_id)
  WHERE external_id IS NOT NULL;

COMMIT;
