-- Deterministic signals for operational responsibilities. No heuristics. No probabilities.

BEGIN;

CREATE OR REPLACE FUNCTION revenue_operator.thread_unresolved(p_thread_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM revenue_operator.operational_responsibilities
    WHERE thread_id = p_thread_id AND satisfied = false
  );
$$;

CREATE OR REPLACE FUNCTION revenue_operator.cross_party_reliance_established(p_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT st.id
    FROM revenue_operator.shared_transactions st
    WHERE st.workspace_id = p_workspace_id
    AND (
      SELECT count(DISTINCT op.assigned_role)
      FROM revenue_operator.operational_responsibilities op
      WHERE op.thread_id = st.id AND op.satisfied = true
    ) >= 2
    LIMIT 1
  );
$$;

COMMIT;
