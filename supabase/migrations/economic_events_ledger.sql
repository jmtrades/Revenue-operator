-- Economic events ledger: record value produced for billing on intervention only. No UI, no behavior change.

BEGIN;

CREATE TABLE IF NOT EXISTS revenue_operator.economic_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN (
    'opportunity_recovered',
    'payment_recovered',
    'commitment_saved',
    'dispute_prevented',
    'no_show_prevented'
  )),
  subject_type text,
  subject_id text,
  value_amount numeric,
  value_currency text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_economic_events_workspace_created
  ON revenue_operator.economic_events (workspace_id, created_at);

CREATE TABLE IF NOT EXISTS revenue_operator.economic_value_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  recovered_revenue numeric NOT NULL DEFAULT 0,
  protected_revenue numeric NOT NULL DEFAULT 0,
  prevented_loss numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_economic_value_ledger_workspace
  ON revenue_operator.economic_value_ledger (workspace_id, period_end);

CREATE TABLE IF NOT EXISTS revenue_operator.billing_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  ledger_id uuid REFERENCES revenue_operator.economic_value_ledger(id) ON DELETE SET NULL,
  export_state text NOT NULL DEFAULT 'pending' CHECK (export_state IN ('pending', 'exported')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_billing_exports_workspace
  ON revenue_operator.billing_exports (workspace_id);

COMMIT;
