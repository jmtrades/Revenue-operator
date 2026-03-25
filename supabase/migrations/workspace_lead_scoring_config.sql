-- Optional per-workspace lead scoring weights. Omitted keys use defaults in lead-scoring.ts
CREATE TABLE IF NOT EXISTS revenue_operator.workspace_lead_scoring_config (
  workspace_id uuid NOT NULL PRIMARY KEY REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  config jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE revenue_operator.workspace_lead_scoring_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_lead_scoring_config_select"
  ON revenue_operator.workspace_lead_scoring_config FOR SELECT
  USING (revenue_operator.workspace_owner_check(workspace_id));

CREATE POLICY "workspace_lead_scoring_config_insert"
  ON revenue_operator.workspace_lead_scoring_config FOR INSERT
  WITH CHECK (revenue_operator.workspace_owner_check(workspace_id));

CREATE POLICY "workspace_lead_scoring_config_update"
  ON revenue_operator.workspace_lead_scoring_config FOR UPDATE
  USING (revenue_operator.workspace_owner_check(workspace_id));

COMMENT ON TABLE revenue_operator.workspace_lead_scoring_config IS 'Optional lead scoring weights per workspace. Keys: baseScore, callCount, durationOver2Min, positiveSentiment, pricingQuestion, booked, returnCaller, negativeSentiment, justBrowsing.';
