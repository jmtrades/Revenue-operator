-- Layer 3: Channel escalation rules. Deterministic; no AI decides escalation.

BEGIN;

CREATE TABLE IF NOT EXISTS revenue_operator.channel_escalation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  domain_type text NOT NULL DEFAULT 'general',
  stage_state text NOT NULL,
  escalation_sequence_json jsonb NOT NULL DEFAULT '[]',
  timing_intervals_json jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, domain_type, stage_state)
);

CREATE INDEX IF NOT EXISTS idx_channel_escalation_rules_workspace
  ON revenue_operator.channel_escalation_rules (workspace_id);

COMMENT ON TABLE revenue_operator.channel_escalation_rules IS 'Deterministic escalation: e.g. SMS ignored -> voice; voice missed -> voicemail_drop. Rules only.';

COMMIT;
