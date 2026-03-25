-- Transactional job claim: SELECT FOR UPDATE SKIP LOCKED so a job never runs twice concurrently.
-- Expired claims can be reclaimed.

CREATE OR REPLACE FUNCTION revenue_operator.claim_next_job(
  p_worker_id text,
  p_ttl_seconds int DEFAULT 300
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = revenue_operator
AS $$
DECLARE
  v_job_id uuid;
BEGIN
  WITH available AS (
    SELECT j.id
    FROM revenue_operator.job_queue j
    LEFT JOIN revenue_operator.job_claims c ON j.id = c.job_id AND c.expires_at > now()
    WHERE j.status = 'pending' AND (c.job_id IS NULL OR c.expires_at <= now())
    ORDER BY j.created_at
    LIMIT 1
    FOR UPDATE OF j SKIP LOCKED
  ),
  ins AS (
    INSERT INTO revenue_operator.job_claims (job_id, worker_id, expires_at)
    SELECT a.id, p_worker_id, now() + (p_ttl_seconds || ' seconds')::interval
    FROM available a
    ON CONFLICT (job_id) DO UPDATE SET
      worker_id = EXCLUDED.worker_id,
      claimed_at = now(),
      expires_at = EXCLUDED.expires_at
    RETURNING job_id
  )
  SELECT ins.job_id INTO v_job_id FROM ins;

  RETURN v_job_id;
END;
$$;
