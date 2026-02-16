-- Deterministic signals for outcome dependencies. Existence logic only.

BEGIN;

CREATE OR REPLACE FUNCTION revenue_operator.context_has_external_uncertainty(
  p_dependent_context_type text,
  p_dependent_context_id text
)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM revenue_operator.outcome_dependencies
    WHERE dependent_context_type = p_dependent_context_type
      AND dependent_context_id = p_dependent_context_id
      AND resolved_at IS NULL
  );
$$;

CREATE OR REPLACE FUNCTION revenue_operator.workspace_has_dependency_pressure(p_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT (
    SELECT count(DISTINCT (dependent_context_type, dependent_context_id))
    FROM revenue_operator.outcome_dependencies
    WHERE workspace_id = p_workspace_id AND resolved_at IS NULL
  ) >= 2;
$$;

CREATE OR REPLACE FUNCTION revenue_operator.thread_propagates_uncertainty(p_thread_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM revenue_operator.operational_responsibilities r
    WHERE r.thread_id = p_thread_id AND r.satisfied = false
  )
  AND EXISTS (
    SELECT 1 FROM revenue_operator.outcome_dependencies d
    WHERE d.source_thread_id = p_thread_id
  );
$$;

CREATE OR REPLACE FUNCTION revenue_operator.workspace_has_thread_propagating_uncertainty(p_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM revenue_operator.shared_transactions t
    JOIN revenue_operator.operational_responsibilities r ON r.thread_id = t.id AND r.satisfied = false
    JOIN revenue_operator.outcome_dependencies d ON d.source_thread_id = t.id AND d.resolved_at IS NULL
    WHERE t.workspace_id = p_workspace_id
  );
$$;

COMMIT;
