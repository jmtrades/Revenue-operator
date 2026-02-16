-- Public corridor sessions: persistent state for public work access without accounts.
-- Enables "same browser returned" vs "new party viewed" detection without PII.

BEGIN;

CREATE TABLE IF NOT EXISTS revenue_operator.public_corridor_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES revenue_operator.shared_transactions(id) ON DELETE CASCADE,
  corridor_token text NOT NULL,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  last_actor_role text CHECK (last_actor_role IN ('originator', 'counterparty', 'downstream', 'observer')),
  last_participant_hint text CHECK (length(last_participant_hint) <= 60)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_public_corridor_sessions_token_thread
  ON revenue_operator.public_corridor_sessions (corridor_token, thread_id);
CREATE INDEX IF NOT EXISTS idx_public_corridor_sessions_thread_last_seen
  ON revenue_operator.public_corridor_sessions (thread_id, last_seen_at);
CREATE INDEX IF NOT EXISTS idx_public_corridor_sessions_token_last_seen
  ON revenue_operator.public_corridor_sessions (corridor_token, last_seen_at);

COMMENT ON TABLE revenue_operator.public_corridor_sessions IS 'Public corridor sessions: persistent state for public work without accounts. No PII.';

COMMIT;
