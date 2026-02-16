-- Thread reference memory: operational continuation without user choice.
-- New activity is attached to existing threads when deterministically justified. Never delete.

BEGIN;

CREATE TABLE IF NOT EXISTS revenue_operator.thread_reference_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  thread_id uuid NOT NULL REFERENCES revenue_operator.shared_transactions(id) ON DELETE CASCADE,
  reference_context_type text NOT NULL CHECK (reference_context_type IN (
    'conversation',
    'commitment',
    'payment_obligation',
    'lead',
    'shared_transaction'
  )),
  reference_context_id text NOT NULL,
  reference_reason text NOT NULL CHECK (reference_reason IN (
    'same_subject',
    'followup_commitment',
    'payment_settlement',
    'conversation_continuation',
    'dispute_revival'
  )),
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_thread_reference_memory_context_once
  ON revenue_operator.thread_reference_memory (workspace_id, reference_context_type, reference_context_id);
CREATE INDEX IF NOT EXISTS idx_thread_reference_memory_thread
  ON revenue_operator.thread_reference_memory (thread_id);
CREATE INDEX IF NOT EXISTS idx_thread_reference_memory_workspace_recorded
  ON revenue_operator.thread_reference_memory (workspace_id, recorded_at);

COMMENT ON TABLE revenue_operator.thread_reference_memory IS 'Reference memory: continuation of reality attached to existing threads. No user controls.';

COMMIT;
