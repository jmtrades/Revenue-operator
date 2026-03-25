-- Doctrine enforcement: processed_at on signals, action_commands for dedup

BEGIN;

-- 1. canonical_signals.processed_at (idempotent consumer)
ALTER TABLE revenue_operator.canonical_signals
  ADD COLUMN IF NOT EXISTS processed_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_canonical_signals_processed_at
  ON revenue_operator.canonical_signals (processed_at)
  WHERE processed_at IS NULL;

-- 2. action_commands: persist before enqueue; worker marks processed_at (no double execution)
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

-- 3. Add LeadReceived to revenue_proof proof_type (for dashboard: leads_received)
ALTER TABLE revenue_operator.revenue_proof
  DROP CONSTRAINT IF EXISTS revenue_proof_proof_type_check;
ALTER TABLE revenue_operator.revenue_proof
  ADD CONSTRAINT revenue_proof_proof_type_check CHECK (proof_type IN (
    'LeadReceived','RecoveredNoShow','NewBooking','SavedConversation','ReactivatedCustomer','RepeatVisit'
  ));

COMMIT;
