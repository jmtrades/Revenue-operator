-- Billing interval (month | year) for Stripe subscription sync.
-- Webhook persists billing_tier + billing_interval from price_id mapping.

BEGIN;

ALTER TABLE revenue_operator.workspaces
  ADD COLUMN IF NOT EXISTS billing_interval text DEFAULT 'month'
  CHECK (billing_interval IN ('month', 'year'));

COMMENT ON COLUMN revenue_operator.workspaces.billing_interval IS 'From Stripe price: month or year. Used for display and feature continuity.';

COMMIT;
