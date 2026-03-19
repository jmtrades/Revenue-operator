BEGIN;

CREATE TABLE IF NOT EXISTS revenue_operator.campaign_daily_counters (
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  counter_date date NOT NULL,
  processed_count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, counter_date)
);

CREATE INDEX IF NOT EXISTS idx_campaign_daily_counters_date
  ON revenue_operator.campaign_daily_counters(counter_date);

ALTER TABLE revenue_operator.campaign_daily_counters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "campaign_daily_counters_select" ON revenue_operator.campaign_daily_counters;
CREATE POLICY "campaign_daily_counters_select"
  ON revenue_operator.campaign_daily_counters
  FOR SELECT
  USING (revenue_operator.workspace_owner_check(workspace_id));

DROP POLICY IF EXISTS "campaign_daily_counters_insert" ON revenue_operator.campaign_daily_counters;
CREATE POLICY "campaign_daily_counters_insert"
  ON revenue_operator.campaign_daily_counters
  FOR INSERT
  WITH CHECK (revenue_operator.workspace_owner_check(workspace_id));

DROP POLICY IF EXISTS "campaign_daily_counters_update" ON revenue_operator.campaign_daily_counters;
CREATE POLICY "campaign_daily_counters_update"
  ON revenue_operator.campaign_daily_counters
  FOR UPDATE
  USING (revenue_operator.workspace_owner_check(workspace_id));

COMMIT;

