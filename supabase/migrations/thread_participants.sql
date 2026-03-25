-- Thread participants: multi-party identity without accounts. Role + optional hint only.
-- Recorded when acting via public respond. No PII. No internal ids returned publicly.

BEGIN;

CREATE TABLE IF NOT EXISTS revenue_operator.thread_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES revenue_operator.shared_transactions(id) ON DELETE CASCADE,
  actor_role text NOT NULL CHECK (actor_role IN ('originator', 'counterparty', 'downstream', 'observer')),
  participant_hint text,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_participant_hint_length CHECK (participant_hint IS NULL OR char_length(trim(participant_hint)) <= 60)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_thread_participants_thread_role
  ON revenue_operator.thread_participants (thread_id, actor_role);
CREATE INDEX IF NOT EXISTS idx_thread_participants_thread
  ON revenue_operator.thread_participants (thread_id);

COMMENT ON TABLE revenue_operator.thread_participants IS 'Federation: who participated in the thread by role. Hint only; no accounts.';

COMMIT;
