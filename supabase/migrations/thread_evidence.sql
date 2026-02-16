-- Thread evidence: proof artifacts without accounts. No file storage; opaque pointer only.
-- Evidence type: note | file_ref | external_ref. No URLs returned publicly.

BEGIN;

CREATE TABLE IF NOT EXISTS revenue_operator.thread_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES revenue_operator.shared_transactions(id) ON DELETE CASCADE,
  actor_role text NOT NULL CHECK (actor_role IN ('originator', 'counterparty', 'downstream', 'observer')),
  evidence_type text NOT NULL CHECK (evidence_type IN ('note', 'file_ref', 'external_ref')),
  evidence_text text,
  evidence_pointer text,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_evidence_text_length CHECK (evidence_text IS NULL OR char_length(trim(evidence_text)) <= 140),
  CONSTRAINT chk_evidence_pointer_length CHECK (evidence_pointer IS NULL OR char_length(evidence_pointer) <= 120)
);

CREATE INDEX IF NOT EXISTS idx_thread_evidence_thread
  ON revenue_operator.thread_evidence (thread_id);

COMMENT ON TABLE revenue_operator.thread_evidence IS 'Federation: outcome evidence attached to thread. No payload returned publicly.';

COMMIT;
