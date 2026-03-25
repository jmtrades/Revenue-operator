-- Persist subscription_item_id for metered usage; unique per item.

BEGIN;

ALTER TABLE revenue_operator.settlement_accounts
  ADD COLUMN IF NOT EXISTS stripe_subscription_item_id text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_settlement_accounts_stripe_subscription_item_id
  ON revenue_operator.settlement_accounts(stripe_subscription_item_id)
  WHERE stripe_subscription_item_id IS NOT NULL;

COMMIT;
