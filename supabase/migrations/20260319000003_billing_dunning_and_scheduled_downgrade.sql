BEGIN;

ALTER TABLE revenue_operator.workspaces
  ADD COLUMN IF NOT EXISTS pending_billing_tier text,
  ADD COLUMN IF NOT EXISTS pending_billing_effective_at timestamptz,
  ADD COLUMN IF NOT EXISTS dunning_amount_due_cents integer,
  ADD COLUMN IF NOT EXISTS dunning_currency text,
  ADD COLUMN IF NOT EXISTS dunning_next_retry_at timestamptz,
  ADD COLUMN IF NOT EXISTS dunning_failure_count integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_workspaces_pending_billing_effective_at
  ON revenue_operator.workspaces(pending_billing_effective_at)
  WHERE pending_billing_effective_at IS NOT NULL;

COMMIT;
