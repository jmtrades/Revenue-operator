-- Deterministic responsibility attribution: where decision authority existed at outcome.
-- Append-only. No updates or deletes.

CREATE TABLE IF NOT EXISTS revenue_operator.responsibility_moments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  subject_type text NOT NULL CHECK (subject_type IN ('commitment', 'opportunity', 'payment', 'shared_transaction')),
  subject_id uuid NOT NULL,
  authority_holder text NOT NULL CHECK (authority_holder IN ('environment', 'business', 'shared')),
  determined_from text NOT NULL CHECK (determined_from IN ('intervention', 'timeout', 'acknowledgement', 'manual_override', 'dispute')),
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_responsibility_moments_workspace_recorded
  ON revenue_operator.responsibility_moments(workspace_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_responsibility_moments_workspace_subject
  ON revenue_operator.responsibility_moments(workspace_id, subject_type, subject_id);
