-- Verification script for reliability doctrine migration.
-- Run in Supabase SQL Editor or psql. Tables in schema revenue_operator.
-- Output: NOTICE lines per check, then OVERALL_VERIFY_RELIABILITY_DOCTRINE = PASS or FAIL.

-- 1) action_commands: attempt_count, last_error, next_retry_at
DO $$
DECLARE
  col_count int;
BEGIN
  SELECT COUNT(DISTINCT column_name) INTO col_count
  FROM information_schema.columns
  WHERE table_schema = 'revenue_operator' AND table_name = 'action_commands'
    AND column_name IN ('attempt_count', 'last_error', 'next_retry_at');
  IF col_count = 3 THEN
    RAISE NOTICE 'action_commands_columns: PASS (attempt_count, last_error, next_retry_at)';
  ELSE
    RAISE NOTICE 'action_commands_columns: FAIL (action_commands missing one or more: attempt_count, last_error, next_retry_at)';
  END IF;
END $$;

-- 2) revenue_proof: proof_dedup_key column and unique index
DO $$
DECLARE
  has_col boolean;
  has_idx boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'revenue_operator' AND table_name = 'revenue_proof' AND column_name = 'proof_dedup_key'
  ) INTO has_col;
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'revenue_operator' AND tablename = 'revenue_proof'
      AND indexdef ILIKE '%proof_dedup_key%' AND indexdef ILIKE '%UNIQUE%'
  ) INTO has_idx;
  IF has_col AND has_idx THEN
    RAISE NOTICE 'revenue_proof_dedup: PASS (proof_dedup_key + unique constraint/index)';
  ELSE
    RAISE NOTICE 'revenue_proof_dedup: FAIL (missing proof_dedup_key or unique index)';
  END IF;
END $$;

-- 3) canonical_signals: processed_at
DO $$
DECLARE
  has_col boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'revenue_operator' AND table_name = 'canonical_signals' AND column_name = 'processed_at'
  ) INTO has_col;
  IF has_col THEN
    RAISE NOTICE 'canonical_signals_processed_at: PASS';
  ELSE
    RAISE NOTICE 'canonical_signals_processed_at: FAIL (canonical_signals missing processed_at)';
  END IF;
END $$;

-- Summary: single result set with overall PASS/FAIL
SELECT
  CASE
    WHEN (
      (SELECT COUNT(DISTINCT column_name) FROM information_schema.columns
       WHERE table_schema = 'revenue_operator' AND table_name = 'action_commands'
         AND column_name IN ('attempt_count', 'last_error', 'next_retry_at')) = 3
      AND (SELECT EXISTS (SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'revenue_operator' AND table_name = 'revenue_proof' AND column_name = 'proof_dedup_key')
           AND EXISTS (SELECT 1 FROM pg_indexes
            WHERE schemaname = 'revenue_operator' AND tablename = 'revenue_proof'
              AND indexdef ILIKE '%proof_dedup_key%' AND indexdef ILIKE '%UNIQUE%'))
      AND (SELECT EXISTS (SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'revenue_operator' AND table_name = 'canonical_signals' AND column_name = 'processed_at'))
    ) THEN 'PASS'
    ELSE 'FAIL'
  END AS "OVERALL_VERIFY_RELIABILITY_DOCTRINE";
