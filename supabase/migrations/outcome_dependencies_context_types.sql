-- Extend outcome_dependencies for commitment and payment_obligation context types.
-- Additive only. No constraint change on dependent_context_type (text).

BEGIN;

CREATE INDEX IF NOT EXISTS idx_outcome_dependencies_workspace_context_unresolved
  ON revenue_operator.outcome_dependencies (workspace_id, dependent_context_type, dependent_context_id)
  WHERE resolved_at IS NULL;

COMMIT;
