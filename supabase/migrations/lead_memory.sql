-- Layer 1: Universal commercial memory. Structured per-lead; no freeform text. Upsert only.

BEGIN;

CREATE TABLE IF NOT EXISTS revenue_operator.lead_memory (
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES revenue_operator.leads(id) ON DELETE CASCADE,
  disclosed_price_range jsonb,
  objections_history_json jsonb NOT NULL DEFAULT '[]',
  commitments_made_json jsonb NOT NULL DEFAULT '[]',
  disclosures_acknowledged_json jsonb NOT NULL DEFAULT '[]',
  consent_records_json jsonb NOT NULL DEFAULT '[]',
  last_channel_used text,
  last_contact_attempt_at timestamptz,
  risk_flags_json jsonb NOT NULL DEFAULT '[]',
  emotional_profile_json jsonb NOT NULL DEFAULT '{}',
  lifecycle_notes_json jsonb NOT NULL DEFAULT '[]',
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, lead_id)
);

CREATE INDEX IF NOT EXISTS idx_lead_memory_workspace
  ON revenue_operator.lead_memory (workspace_id);
CREATE INDEX IF NOT EXISTS idx_lead_memory_last_contact
  ON revenue_operator.lead_memory (workspace_id, last_contact_attempt_at DESC NULLS LAST);

COMMENT ON TABLE revenue_operator.lead_memory IS 'Structured commercial memory per lead. Strategy, compliance, escalation. Upsert only; no freeform text.';

COMMIT;
