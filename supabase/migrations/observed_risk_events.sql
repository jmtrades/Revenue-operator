-- Observed risk events: add related_external_ref and dedupe by day.
BEGIN;

CREATE TABLE IF NOT EXISTS revenue_operator.observed_risk_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  risk_type text NOT NULL,
  subject_type text NOT NULL,
  subject_id text NOT NULL,
  detected_at timestamptz NOT NULL DEFAULT now(),
  prevented_if_active boolean NOT NULL DEFAULT true,
  related_external_ref text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE revenue_operator.observed_risk_events ADD COLUMN IF NOT EXISTS related_external_ref text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_observed_risk_events_dedupe
  ON revenue_operator.observed_risk_events (workspace_id, risk_type, subject_type, subject_id, (CAST(detected_at AT TIME ZONE 'UTC' AS date)));

CREATE INDEX IF NOT EXISTS idx_observed_risk_events_workspace_detected
  ON revenue_operator.observed_risk_events (workspace_id, detected_at DESC);

COMMIT;
