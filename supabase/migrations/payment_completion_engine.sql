-- Payment Completion Engine: every owed payment reaches a financial outcome.
-- Terminal outcomes: paid, confirmed_pending, failed, written_off; or authority_required.

BEGIN;

CREATE TABLE IF NOT EXISTS revenue_operator.payment_obligations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  subject_type text NOT NULL CHECK (subject_type IN ('invoice', 'booking', 'subscription', 'custom')),
  subject_id text NOT NULL,
  amount integer NOT NULL,
  currency text NOT NULL DEFAULT 'usd',
  due_at timestamptz NOT NULL,
  state text NOT NULL DEFAULT 'pending'
    CHECK (state IN ('pending', 'overdue', 'recovering', 'resolved')),
  terminal_outcome text CHECK (terminal_outcome IS NULL OR terminal_outcome IN ('paid', 'confirmed_pending', 'failed', 'written_off')),
  recovery_attempts int NOT NULL DEFAULT 0,
  authority_required boolean NOT NULL DEFAULT false,
  last_attempt_at timestamptz,
  next_attempt_at timestamptz,
  lead_id uuid REFERENCES revenue_operator.leads(id) ON DELETE SET NULL,
  conversation_id uuid REFERENCES revenue_operator.conversations(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_obligations_workspace_state
  ON revenue_operator.payment_obligations (workspace_id, state)
  WHERE state != 'resolved';

CREATE INDEX IF NOT EXISTS idx_payment_obligations_next_attempt
  ON revenue_operator.payment_obligations (next_attempt_at)
  WHERE state = 'recovering' AND authority_required = false;

CREATE INDEX IF NOT EXISTS idx_payment_obligations_authority
  ON revenue_operator.payment_obligations (workspace_id)
  WHERE authority_required = true;

CREATE INDEX IF NOT EXISTS idx_payment_obligations_subject
  ON revenue_operator.payment_obligations (subject_type, subject_id);

COMMIT;
