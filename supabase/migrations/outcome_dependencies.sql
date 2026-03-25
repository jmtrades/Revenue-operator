-- Outcome dependencies: one outcome relies on another thread's completion for stability.
-- Never delete. resolved_at set when source thread has no unresolved responsibilities.
-- Additive only. No changes to existing tables.

BEGIN;

CREATE TABLE IF NOT EXISTS revenue_operator.outcome_dependencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  source_thread_id uuid NOT NULL REFERENCES revenue_operator.shared_transactions(id) ON DELETE CASCADE,
  dependent_context_type text NOT NULL,
  dependent_context_id text NOT NULL,
  dependency_type text NOT NULL CHECK (dependency_type IN (
    'verification_reference',
    'downstream_commitment',
    'financial_finalization',
    'delivery_confirmation',
    'external_reporting'
  )),
  stability_affected boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_outcome_dependencies_source_thread
  ON revenue_operator.outcome_dependencies (source_thread_id);
CREATE INDEX IF NOT EXISTS idx_outcome_dependencies_dependent
  ON revenue_operator.outcome_dependencies (dependent_context_type, dependent_context_id);
CREATE INDEX IF NOT EXISTS idx_outcome_dependencies_workspace_unresolved
  ON revenue_operator.outcome_dependencies (workspace_id)
  WHERE resolved_at IS NULL;

COMMENT ON TABLE revenue_operator.outcome_dependencies IS 'External dependence: dependent context is uncertain until source thread has no unresolved responsibilities.';

COMMIT;
