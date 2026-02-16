-- Observed risk events during observation phase (no automation)
BEGIN;

CREATE TABLE IF NOT EXISTS revenue_operator.observed_risk_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  risk_type text NOT NULL,
  subject_type text NOT NULL,
  subject_id text NOT NULL,
  detected_at timestamptz NOT NULL DEFAULT now(),
  prevented_if_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_observed_risk_events_workspace_detected
  ON revenue_operator.observed_risk_events (workspace_id, detected_at DESC);

COMMIT;
