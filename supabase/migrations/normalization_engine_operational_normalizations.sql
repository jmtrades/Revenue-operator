-- Normalization engine: behavioral shift evidence (action without verification where verification occurred before).

CREATE TABLE IF NOT EXISTS revenue_operator.operational_normalizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  normalization_type text NOT NULL CHECK (normalization_type IN (
    'verification_absent',
    'direct_progression',
    'silent_acceptance',
    'uninterrupted_followthrough'
  )),
  reference_id text NOT NULL,
  prior_verification_observed boolean NOT NULL DEFAULT true,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_operational_normalizations_workspace_recorded
  ON revenue_operator.operational_normalizations(workspace_id, recorded_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_operational_normalizations_daily_dedupe
  ON revenue_operator.operational_normalizations(
    workspace_id,
    normalization_type,
    reference_id,
    ((recorded_at AT TIME ZONE 'UTC')::date)
  );

ALTER TABLE revenue_operator.workspace_orientation_state
  ADD COLUMN IF NOT EXISTS normalization_orientation_recorded_at timestamptz;
