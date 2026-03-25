-- Workspace email config, email templates, and email send queue (Task 23).

BEGIN;

CREATE TABLE IF NOT EXISTS revenue_operator.workspace_email_config (
  workspace_id uuid PRIMARY KEY REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'resend' CHECK (provider IN ('resend', 'sendgrid')),
  api_key_encrypted text,
  from_email text NOT NULL,
  from_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS revenue_operator.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  slug text NOT NULL,
  name text NOT NULL,
  subject text NOT NULL,
  body_html text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_email_templates_workspace ON revenue_operator.email_templates(workspace_id);

CREATE TABLE IF NOT EXISTS revenue_operator.email_send_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  to_email text NOT NULL,
  subject text NOT NULL,
  body_html text NOT NULL,
  template_slug text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  external_id text,
  error_message text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_send_queue_workspace_status ON revenue_operator.email_send_queue(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_email_send_queue_created ON revenue_operator.email_send_queue(created_at DESC);

ALTER TABLE revenue_operator.workspace_email_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_operator.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_operator.email_send_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workspace_email_config_all" ON revenue_operator.workspace_email_config;
CREATE POLICY "workspace_email_config_all" ON revenue_operator.workspace_email_config FOR ALL
  USING (revenue_operator.workspace_owner_check(workspace_id))
  WITH CHECK (revenue_operator.workspace_owner_check(workspace_id));

DROP POLICY IF EXISTS "email_templates_all" ON revenue_operator.email_templates;
CREATE POLICY "email_templates_all" ON revenue_operator.email_templates FOR ALL
  USING (revenue_operator.workspace_owner_check(workspace_id))
  WITH CHECK (revenue_operator.workspace_owner_check(workspace_id));

DROP POLICY IF EXISTS "email_send_queue_all" ON revenue_operator.email_send_queue;
CREATE POLICY "email_send_queue_all" ON revenue_operator.email_send_queue FOR ALL
  USING (revenue_operator.workspace_owner_check(workspace_id))
  WITH CHECK (revenue_operator.workspace_owner_check(workspace_id));

COMMIT;
