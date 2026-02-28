-- Conversation strategy state and thread emotional signals. Append-only semantics; upserts only, no deletes.

BEGIN;

CREATE TABLE IF NOT EXISTS revenue_operator.conversation_strategy_state (
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL,
  thread_id uuid,
  work_unit_id uuid,
  domain_type text NOT NULL DEFAULT 'general',
  current_state text NOT NULL DEFAULT 'discovery'
    CHECK (current_state IN (
      'discovery', 'pain_identification', 'qualification', 'authority_check', 'timeline_check',
      'financial_alignment', 'objection_handling', 'offer_positioning', 'compliance_disclosure',
      'commitment_request', 'follow_up_lock', 'escalation', 'disqualification'
    )),
  last_intent_type text,
  last_channel text,
  jurisdiction text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, conversation_id)
);

CREATE INDEX IF NOT EXISTS idx_conversation_strategy_state_workspace
  ON revenue_operator.conversation_strategy_state (workspace_id);
CREATE INDEX IF NOT EXISTS idx_conversation_strategy_state_thread
  ON revenue_operator.conversation_strategy_state (thread_id) WHERE thread_id IS NOT NULL;

COMMENT ON TABLE revenue_operator.conversation_strategy_state IS 'Deterministic strategy state per conversation. Upserts only; no deletes.';

CREATE TABLE IF NOT EXISTS revenue_operator.thread_emotional_signals (
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  thread_id uuid NOT NULL,
  signals_json jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, thread_id)
);

COMMENT ON TABLE revenue_operator.thread_emotional_signals IS 'Emotional signals per thread (validated keys only). Upserts only; no deletes.';

COMMIT;
