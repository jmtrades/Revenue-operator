-- Optional per-workspace lead scoring weights. Omitted keys use defaults in lead-scoring.ts
CREATE TABLE IF NOT EXISTS revenue_operator.workspace_lead_scoring_config (
  workspace_id uuid NOT NULL PRIMARY KEY REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  config jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE revenue_operator.workspace_lead_scoring_config IS 'Optional lead scoring weights per workspace. Keys: baseScore, callCount, durationOver2Min, positiveSentiment, pricingQuestion, booked, returnCaller, negativeSentiment, justBrowsing.';
