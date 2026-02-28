-- Pricing layer: billing_tier for feature gating (solo | growth | team | enterprise).
-- Deterministic. Enforced in policy layer.

BEGIN;

ALTER TABLE revenue_operator.workspaces
  ADD COLUMN IF NOT EXISTS billing_tier text NOT NULL DEFAULT 'solo'
  CHECK (billing_tier IN ('solo','growth','team','enterprise'));

COMMENT ON COLUMN revenue_operator.workspaces.billing_tier IS 'Feature gate: solo ($297), growth ($997), team ($2500), enterprise (contract).';

COMMIT;
