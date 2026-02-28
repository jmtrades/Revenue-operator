-- Message templates: workspace-scoped, tokenized body ({{slot}}), no freeform AI.
-- Body length caps per channel; doctrine sanitizer enforced in app.

BEGIN;

CREATE TABLE IF NOT EXISTS revenue_operator.message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  template_id text NOT NULL,
  channel text NOT NULL CHECK (channel IN ('sms','email','whatsapp','voice')),
  intent_type text NOT NULL,
  body text NOT NULL,
  max_chars int NOT NULL DEFAULT 320,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, template_id)
);

CREATE INDEX IF NOT EXISTS idx_message_templates_workspace
  ON revenue_operator.message_templates (workspace_id);
CREATE INDEX IF NOT EXISTS idx_message_templates_lookup
  ON revenue_operator.message_templates (workspace_id, channel, intent_type);

COMMENT ON TABLE revenue_operator.message_templates IS 'Workspace templates: tokenized body only (e.g. {{name}}). Caps and forbidden words enforced in app.';

COMMIT;
