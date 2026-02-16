-- Causality engine: dependency of outcomes on intervention. No metrics, no probabilities.

BEGIN;

CREATE TABLE IF NOT EXISTS revenue_operator.causal_chains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  subject_type text NOT NULL,
  subject_id text NOT NULL,
  baseline_expected_outcome text NOT NULL,
  intervention_type text NOT NULL,
  observed_outcome text NOT NULL,
  dependency_established boolean NOT NULL DEFAULT true,
  determined_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_causal_chains_workspace_determined
  ON revenue_operator.causal_chains(workspace_id, determined_at DESC);

CREATE TABLE IF NOT EXISTS revenue_operator.counterfactual_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  reference_id text,
  predicted_without_intervention text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_counterfactual_events_workspace_created
  ON revenue_operator.counterfactual_events(workspace_id, created_at DESC);

COMMIT;
