-- Thread assignments: responsibility transfer inside the thread. No delete.
-- One open assignment per (thread_id, assignment_type, assigned_role).

BEGIN;

CREATE TABLE IF NOT EXISTS revenue_operator.thread_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES revenue_operator.shared_transactions(id) ON DELETE CASCADE,
  assigned_role text NOT NULL CHECK (assigned_role IN ('originator', 'counterparty', 'downstream')),
  assignment_type text NOT NULL CHECK (assignment_type IN (
    'perform_work',
    'verify_outcome',
    'provide_information',
    'confirm_delivery'
  )),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by_event_id uuid REFERENCES revenue_operator.reciprocal_events(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_thread_assignments_open_per_role_type
  ON revenue_operator.thread_assignments (thread_id, assigned_role, assignment_type)
  WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_thread_assignments_thread
  ON revenue_operator.thread_assignments (thread_id);

COMMENT ON TABLE revenue_operator.thread_assignments IS 'Federation: assigned obligations within the corridor. Resolved by event.';

COMMIT;
