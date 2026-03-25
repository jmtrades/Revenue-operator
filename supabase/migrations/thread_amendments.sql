-- Thread amendments: post-reliance changes become visible. Append only. No deletes.

BEGIN;

CREATE TABLE IF NOT EXISTS revenue_operator.thread_amendments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES revenue_operator.shared_transactions(id) ON DELETE CASCADE,
  amendment_type text NOT NULL CHECK (amendment_type IN (
    'state_change',
    'outcome_change',
    'evidence_change',
    'responsibility_change'
  )),
  amendment_summary text NOT NULL,
  caused_by_event_id uuid REFERENCES revenue_operator.reciprocal_events(id) ON DELETE SET NULL,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_thread_amendments_thread
  ON revenue_operator.thread_amendments (thread_id);
CREATE INDEX IF NOT EXISTS idx_thread_amendments_recorded
  ON revenue_operator.thread_amendments (recorded_at);

COMMENT ON TABLE revenue_operator.thread_amendments IS 'Institutional auditability: later alterations to relied-upon threads. Consequence only.';

COMMIT;
