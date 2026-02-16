-- Track suspension entry creation once per suspension (authority boundary).

BEGIN;

ALTER TABLE revenue_operator.settlement_accounts
  ADD COLUMN IF NOT EXISTS suspension_entry_created_at timestamptz;

COMMIT;
