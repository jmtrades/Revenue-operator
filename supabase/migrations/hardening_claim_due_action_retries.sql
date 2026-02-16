-- P1-4: Claim-safe selection of due action retries. Prevents same command enqueued twice.
-- Guarantee: no silent action failure (no duplicate execution).

CREATE OR REPLACE FUNCTION revenue_operator.claim_due_action_retries(p_limit int DEFAULT 20)
RETURNS TABLE (
  id uuid,
  workspace_id uuid,
  lead_id uuid,
  type text,
  payload jsonb,
  dedup_key text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = revenue_operator
AS $$
BEGIN
  RETURN QUERY
  WITH due AS (
    SELECT ac.id, ac.workspace_id, ac.lead_id, ac.type, ac.payload, ac.dedup_key
    FROM revenue_operator.action_commands ac
    WHERE ac.processed_at IS NULL
      AND ac.attempt_count >= 1
      AND ac.attempt_count < 8
      AND ac.next_retry_at IS NOT NULL
      AND ac.next_retry_at <= now()
    ORDER BY ac.next_retry_at
    LIMIT p_limit
    FOR UPDATE OF ac SKIP LOCKED
  ),
  updated AS (
    UPDATE revenue_operator.action_commands ac
    SET next_retry_at = (now() + interval '60 seconds')::timestamptz
    FROM due
    WHERE ac.id = due.id
    RETURNING ac.id, ac.workspace_id, ac.lead_id, ac.type, ac.payload, ac.dedup_key
  )
  SELECT u.id, u.workspace_id, u.lead_id, u.type, u.payload, u.dedup_key FROM updated u;
END;
$$;
