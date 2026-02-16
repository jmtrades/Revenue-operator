-- Continuation exposures: unresolved state persisted; intervention stopped it. No prediction, state + time only.

BEGIN;

CREATE TABLE IF NOT EXISTS revenue_operator.continuation_exposures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  subject_type text NOT NULL,
  subject_id text NOT NULL,
  unresolved_state text NOT NULL,
  duration_seconds integer NOT NULL DEFAULT 0,
  intervention_stopped_it boolean NOT NULL DEFAULT false,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_continuation_exposures_workspace_stopped_recorded
  ON revenue_operator.continuation_exposures(workspace_id, intervention_stopped_it, recorded_at DESC);

COMMIT;
