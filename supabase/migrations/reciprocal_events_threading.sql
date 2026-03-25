-- Reciprocal events: operational thread per shared transaction.
-- Thread = shared_transaction lifecycle; events record who did what and transfer of responsibility.
-- No new UI. Continuity evidence only. Supports cross-party coordination without accounts.

BEGIN;

CREATE TABLE IF NOT EXISTS revenue_operator.reciprocal_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES revenue_operator.shared_transactions(id) ON DELETE CASCADE,
  actor_role text NOT NULL CHECK (actor_role IN ('originator', 'counterparty', 'downstream', 'observer')),
  operational_action text NOT NULL,
  outcome_reference text,
  authority_transfer boolean NOT NULL DEFAULT false,
  dependency_created text,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reciprocal_events_thread_recorded
  ON revenue_operator.reciprocal_events (thread_id, recorded_at);

CREATE INDEX IF NOT EXISTS idx_reciprocal_events_actor
  ON revenue_operator.reciprocal_events (thread_id, actor_role);

COMMENT ON TABLE revenue_operator.reciprocal_events IS 'Operational coordination thread: who acted, what action, outcome reference. No internal ids exposed.';

COMMIT;
