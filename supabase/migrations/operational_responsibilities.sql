-- Operational responsibilities: what still requires action per thread.
-- One open responsibility per required_action per thread. Resolve only; never delete.
-- Thread is complete or awaiting responsibility. Deterministic.

BEGIN;

CREATE TABLE IF NOT EXISTS revenue_operator.operational_responsibilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES revenue_operator.shared_transactions(id) ON DELETE CASCADE,
  assigned_role text NOT NULL CHECK (assigned_role IN ('originator', 'counterparty', 'downstream', 'observer')),
  required_action text NOT NULL,
  satisfied boolean NOT NULL DEFAULT false,
  satisfied_by_event_id uuid REFERENCES revenue_operator.reciprocal_events(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_operational_responsibilities_thread_action_open
  ON revenue_operator.operational_responsibilities (thread_id, required_action)
  WHERE satisfied = false;

CREATE INDEX IF NOT EXISTS idx_operational_responsibilities_thread_satisfied
  ON revenue_operator.operational_responsibilities (thread_id, satisfied);

CREATE INDEX IF NOT EXISTS idx_operational_responsibilities_resolved
  ON revenue_operator.operational_responsibilities (thread_id, resolved_at)
  WHERE satisfied = true;

COMMENT ON TABLE revenue_operator.operational_responsibilities IS 'Open or resolved obligation per thread. Only one open per required_action per thread.';

COMMIT;
