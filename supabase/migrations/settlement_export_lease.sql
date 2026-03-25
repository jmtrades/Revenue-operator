-- Lease table to prevent double export across multiple cron runners.

BEGIN;

CREATE TABLE IF NOT EXISTS revenue_operator.settlement_export_leases (
  workspace_id uuid PRIMARY KEY REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  lease_until timestamptz NOT NULL
);

CREATE OR REPLACE FUNCTION revenue_operator.try_acquire_settlement_export_lease(
  p_workspace_id uuid,
  p_lease_until timestamptz
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  n int;
BEGIN
  INSERT INTO revenue_operator.settlement_export_leases (workspace_id, lease_until)
  VALUES (p_workspace_id, p_lease_until)
  ON CONFLICT (workspace_id) DO UPDATE
  SET lease_until = p_lease_until
  WHERE revenue_operator.settlement_export_leases.lease_until IS NULL
     OR revenue_operator.settlement_export_leases.lease_until < now();
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n > 0;
END;
$$;

COMMIT;
