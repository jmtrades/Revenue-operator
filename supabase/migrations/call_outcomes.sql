-- Layer 2: Call outcome ingestion. Structured result from executor; persist to work_unit, lead_memory, emotional signals.

BEGIN;

CREATE TABLE IF NOT EXISTS revenue_operator.call_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  work_unit_id uuid,
  lead_id uuid REFERENCES revenue_operator.leads(id) ON DELETE SET NULL,
  conversation_id uuid,
  duration_seconds int,
  disposition text,
  objections_tags_json jsonb NOT NULL DEFAULT '[]',
  commitment_outcome text,
  sentiment_score numeric CHECK (sentiment_score IS NULL OR (sentiment_score >= 0 AND sentiment_score <= 1)),
  consent_confirmed boolean,
  compliance_confirmed boolean,
  received_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_call_outcomes_workspace
  ON revenue_operator.call_outcomes (workspace_id);
CREATE INDEX IF NOT EXISTS idx_call_outcomes_work_unit
  ON revenue_operator.call_outcomes (work_unit_id) WHERE work_unit_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_call_outcomes_lead
  ON revenue_operator.call_outcomes (lead_id) WHERE lead_id IS NOT NULL;

COMMENT ON TABLE revenue_operator.call_outcomes IS 'Structured call result from executor. Append-only. Feeds lead_memory and strategy.';

COMMIT;
