-- Exposure engine: operational exposures (near-failures) and interruption evidence.

CREATE TABLE IF NOT EXISTS revenue_operator.operational_exposures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  exposure_type text NOT NULL CHECK (exposure_type IN (
    'reply_delay_risk',
    'attendance_uncertainty_risk',
    'payment_stall_risk',
    'counterparty_unconfirmed_risk',
    'commitment_outcome_uncertain'
  )),
  subject_type text NOT NULL CHECK (subject_type IN (
    'conversation',
    'commitment',
    'payment_obligation',
    'shared_transaction'
  )),
  subject_id text NOT NULL,
  related_external_ref text,
  first_observed_at timestamptz NOT NULL DEFAULT now(),
  last_observed_at timestamptz NOT NULL DEFAULT now(),
  exposure_resolved_at timestamptz,
  interrupted_by_process boolean NOT NULL DEFAULT false,
  interruption_source text CHECK (interruption_source IN (
    'causal_chain',
    'continuation_stopped',
    'coordination_displacement',
    'resolved_after_intervention'
  )),
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_operational_exposures_workspace_last
  ON revenue_operator.operational_exposures(workspace_id, last_observed_at DESC);

CREATE INDEX IF NOT EXISTS idx_operational_exposures_workspace_interrupted_last
  ON revenue_operator.operational_exposures(workspace_id, interrupted_by_process, last_observed_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_operational_exposures_daily_dedupe
  ON revenue_operator.operational_exposures(
    workspace_id,
    exposure_type,
    subject_type,
    subject_id,
    ((first_observed_at AT TIME ZONE 'UTC')::date)
  );
