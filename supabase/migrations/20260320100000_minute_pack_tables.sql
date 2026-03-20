-- Minute pack purchase tracking and workspace minute balance
-- Used by the buy-minutes API and webhook handler

-- Track every minute pack purchase for billing audit trail
CREATE TABLE IF NOT EXISTS minute_pack_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  pack_id text NOT NULL,
  minutes integer NOT NULL,
  price_cents integer NOT NULL,
  stripe_payment_intent_id text NOT NULL UNIQUE,
  credited_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_minute_pack_purchases_workspace
  ON minute_pack_purchases(workspace_id);
CREATE INDEX IF NOT EXISTS idx_minute_pack_purchases_stripe_pi
  ON minute_pack_purchases(stripe_payment_intent_id);

-- Workspace bonus minute balance (from pack purchases)
-- Bonus minutes are consumed AFTER plan-included minutes are exhausted,
-- but BEFORE overage billing kicks in.
CREATE TABLE IF NOT EXISTS workspace_minute_balance (
  workspace_id uuid PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  bonus_minutes integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
