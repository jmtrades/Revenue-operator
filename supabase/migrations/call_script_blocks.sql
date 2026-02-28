-- Call script blocks: state machine + slot-based lines for voice. No freeform AI.

BEGIN;

CREATE TABLE IF NOT EXISTS revenue_operator.call_script_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  domain_type text NOT NULL DEFAULT 'general',
  jurisdiction text NOT NULL DEFAULT 'UK',
  stage_state text NOT NULL,
  block_type text NOT NULL CHECK (block_type IN (
    'opening', 'discovery', 'qualification', 'objection', 'compliance', 'close', 'fallback'
  )),
  lines_json jsonb NOT NULL DEFAULT '[]',
  required_disclosures_json jsonb NOT NULL DEFAULT '[]',
  forbidden_phrases_json jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_call_script_blocks_workspace
  ON revenue_operator.call_script_blocks (workspace_id);
CREATE INDEX IF NOT EXISTS idx_call_script_blocks_scope
  ON revenue_operator.call_script_blocks (workspace_id, domain_type, jurisdiction, stage_state);

COMMENT ON TABLE revenue_operator.call_script_blocks IS 'Voice script blocks per stage. lines_json: array of ≤120 char lines.';

COMMIT;
