-- Revenue Performance Infrastructure: RevenueLifecycle per lead + revenue_state
-- Do not change universal conversation architecture. Add lifecycle intelligence layer.

BEGIN;

-- revenue_lifecycles: one row per lead
CREATE TABLE IF NOT EXISTS revenue_operator.revenue_lifecycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL UNIQUE REFERENCES revenue_operator.leads(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  first_contact_at timestamptz,
  booked_at timestamptz,
  showed_at timestamptz,
  last_visit_at timestamptz,
  next_expected_visit_at timestamptz,
  lifecycle_stage text NOT NULL DEFAULT 'new_lead'
    CHECK (lifecycle_stage IN (
      'new_lead','active_prospect','scheduled','showed','client','repeat_client','at_risk','lost','reactivated'
    )),
  lifetime_value_stage text NOT NULL DEFAULT 'new'
    CHECK (lifetime_value_stage IN ('new','first_visit','repeat','vip')),
  revenue_state text NOT NULL DEFAULT 'potential'
    CHECK (revenue_state IN (
      'potential','scheduled','secured','realized','repeat','at_risk','lost','recovered'
    )),
  dropoff_risk numeric DEFAULT 0 CHECK (dropoff_risk >= 0 AND dropoff_risk <= 1),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_revenue_lifecycles_workspace_stage
  ON revenue_operator.revenue_lifecycles (workspace_id, lifecycle_stage);
CREATE INDEX IF NOT EXISTS idx_revenue_lifecycles_workspace_revenue_state
  ON revenue_operator.revenue_lifecycles (workspace_id, revenue_state);
CREATE INDEX IF NOT EXISTS idx_revenue_lifecycles_next_visit
  ON revenue_operator.revenue_lifecycles (workspace_id, next_expected_visit_at)
  WHERE next_expected_visit_at IS NOT NULL;

COMMIT;
