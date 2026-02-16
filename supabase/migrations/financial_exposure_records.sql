-- Monetary consequence: financial exposure records. One per situation per day (dedupe by workspace/category/ref/day).
BEGIN;

CREATE TABLE IF NOT EXISTS revenue_operator.financial_exposure_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN (
    'revenue_at_risk', 'payment_delay', 'customer_loss_risk', 'idle_capacity'
  )),
  related_external_ref text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_financial_exposure_records_dedupe
  ON revenue_operator.financial_exposure_records (
    workspace_id,
    category,
    COALESCE(related_external_ref, ''),
    date_trunc('day', created_at)
  );

CREATE INDEX IF NOT EXISTS idx_financial_exposure_records_workspace_resolved
  ON revenue_operator.financial_exposure_records (workspace_id, resolved_at);
CREATE INDEX IF NOT EXISTS idx_financial_exposure_records_created
  ON revenue_operator.financial_exposure_records (workspace_id, created_at DESC);

COMMIT;
