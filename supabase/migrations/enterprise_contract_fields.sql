-- Enterprise: contract ref and feature overrides. No pricing UI; capability only.

BEGIN;

ALTER TABLE revenue_operator.workspaces
  ADD COLUMN IF NOT EXISTS enterprise_contract_ref text,
  ADD COLUMN IF NOT EXISTS enterprise_features_json jsonb;

COMMENT ON COLUMN revenue_operator.workspaces.enterprise_contract_ref IS 'Enterprise contract reference.';
COMMENT ON COLUMN revenue_operator.workspaces.enterprise_features_json IS 'Feature overrides for enterprise (caps, etc.).';

COMMIT;
