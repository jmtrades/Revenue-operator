-- Participant org hints: soft clustering for multi-organization detection without accounts.
-- Sanitized, no PII, ≤40 chars.

BEGIN;

CREATE TABLE IF NOT EXISTS revenue_operator.participant_org_hints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES revenue_operator.shared_transactions(id) ON DELETE CASCADE,
  actor_role text NOT NULL CHECK (actor_role IN ('originator', 'counterparty', 'downstream', 'observer')),
  org_hint text NOT NULL CHECK (length(org_hint) <= 40),
  first_seen_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_participant_org_hints_thread_role_hint
  ON revenue_operator.participant_org_hints (thread_id, actor_role, org_hint);
CREATE INDEX IF NOT EXISTS idx_participant_org_hints_org_hint_first_seen
  ON revenue_operator.participant_org_hints (org_hint, first_seen_at);
CREATE INDEX IF NOT EXISTS idx_participant_org_hints_thread_first_seen
  ON revenue_operator.participant_org_hints (thread_id, first_seen_at);

COMMENT ON TABLE revenue_operator.participant_org_hints IS 'Participant org hints: soft clustering for multi-organization detection. Sanitized, no PII.';

COMMIT;
