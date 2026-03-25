-- Shared Transaction Assurance: operational record between two parties.
-- Transaction is real only when both sides acknowledge. Prevents disputes, supports network adoption.

BEGIN;

CREATE TABLE IF NOT EXISTS revenue_operator.shared_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  counterparty_identifier text NOT NULL,
  subject_type text NOT NULL CHECK (subject_type IN ('booking', 'job', 'payment', 'delivery', 'agreement')),
  subject_id text NOT NULL,
  initiated_by text NOT NULL CHECK (initiated_by IN ('business', 'counterparty')),
  state text NOT NULL DEFAULT 'pending_acknowledgement'
    CHECK (state IN ('pending_acknowledgement', 'acknowledged', 'disputed', 'expired')),
  acknowledgement_required boolean NOT NULL DEFAULT true,
  acknowledgement_deadline timestamptz,
  acknowledged_at timestamptz,
  dispute_reason text,
  authority_required boolean NOT NULL DEFAULT false,
  reminder_sent_count int NOT NULL DEFAULT 0,
  lead_id uuid REFERENCES revenue_operator.leads(id) ON DELETE SET NULL,
  conversation_id uuid REFERENCES revenue_operator.conversations(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shared_transactions_workspace_state
  ON revenue_operator.shared_transactions (workspace_id, state)
  WHERE state IN ('pending_acknowledgement', 'disputed', 'expired');

CREATE INDEX IF NOT EXISTS idx_shared_transactions_deadline
  ON revenue_operator.shared_transactions (acknowledgement_deadline)
  WHERE state = 'pending_acknowledgement' AND authority_required = false;

CREATE INDEX IF NOT EXISTS idx_shared_transactions_authority
  ON revenue_operator.shared_transactions (workspace_id)
  WHERE authority_required = true;

CREATE INDEX IF NOT EXISTS idx_shared_transactions_subject
  ON revenue_operator.shared_transactions (subject_type, subject_id);

COMMIT;
