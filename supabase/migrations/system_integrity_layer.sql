-- System Integrity Layer: audit history and reconciliation run tracking.
-- No UI, no config, no metrics. Operator verifies its own correctness.

BEGIN;

-- 1. system_integrity_history: one row per audit run per workspace
CREATE TABLE IF NOT EXISTS revenue_operator.system_integrity_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  checked_at timestamptz NOT NULL DEFAULT now(),
  result text NOT NULL CHECK (result IN ('ok', 'violations')),
  violation_count integer NOT NULL DEFAULT 0,
  details_json jsonb NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_system_integrity_history_workspace_checked
  ON revenue_operator.system_integrity_history (workspace_id, checked_at DESC);

-- 2. workspace_reconciliation_last_run: updated by reconcile-reality cron for freshness check
CREATE TABLE IF NOT EXISTS revenue_operator.workspace_reconciliation_last_run (
  workspace_id uuid NOT NULL PRIMARY KEY REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  last_run_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Allow SystemIntegrityVerified in revenue_proof (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'revenue_operator' AND table_name = 'revenue_proof') THEN
    ALTER TABLE revenue_operator.revenue_proof DROP CONSTRAINT IF EXISTS revenue_proof_proof_type_check;
    ALTER TABLE revenue_operator.revenue_proof
      ADD CONSTRAINT revenue_proof_proof_type_check CHECK (proof_type IN (
        'LeadReceived','RecoveredNoShow','NewBooking','SavedConversation','ReactivatedCustomer','RepeatVisit','ResponsibilityResolved','SystemIntegrityVerified'
      ));
  END IF;
END $$;

COMMIT;
