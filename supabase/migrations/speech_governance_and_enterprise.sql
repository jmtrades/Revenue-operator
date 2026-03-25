-- Speech governance + enterprise control plane (RBAC, audit, templates, policies, traces).
-- Append-only where specified. Doctrine-safe; no PII in traces.

BEGIN;

-- workspace_roles: RBAC (owner|admin|operator|auditor|compliance)
CREATE TABLE IF NOT EXISTS revenue_operator.workspace_roles (
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('owner','admin','operator','auditor','compliance')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_workspace_roles_user
  ON revenue_operator.workspace_roles (user_id);

-- speech_templates (workspace_id NULL = global)
CREATE TABLE IF NOT EXISTS revenue_operator.speech_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  domain_type text NOT NULL DEFAULT 'general',
  jurisdiction text NOT NULL DEFAULT 'UK',
  channel text NOT NULL CHECK (channel IN ('sms','email','whatsapp')),
  intent_type text NOT NULL,
  clause_type text NOT NULL,
  template_key text NOT NULL,
  template_body text NOT NULL,
  version int NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','retired')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_template_body_length CHECK (char_length(template_body) <= 500)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_speech_templates_workspace_scope_version
  ON revenue_operator.speech_templates (workspace_id, domain_type, jurisdiction, channel, intent_type, clause_type, version) WHERE workspace_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_speech_templates_global_scope_version
  ON revenue_operator.speech_templates (domain_type, jurisdiction, channel, intent_type, clause_type, version) WHERE workspace_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_speech_templates_workspace_status
  ON revenue_operator.speech_templates (workspace_id, status) WHERE workspace_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_speech_templates_lookup
  ON revenue_operator.speech_templates (domain_type, jurisdiction, channel, intent_type, clause_type, status);

-- speech_policies (workspace_id NULL = global)
CREATE TABLE IF NOT EXISTS revenue_operator.speech_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  domain_type text NOT NULL DEFAULT 'general',
  jurisdiction text NOT NULL DEFAULT 'UK',
  channel text NOT NULL CHECK (channel IN ('sms','email','whatsapp')),
  policy_key text NOT NULL,
  policy_json jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','retired')),
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_speech_policies_workspace
  ON revenue_operator.speech_policies (workspace_id);
CREATE INDEX IF NOT EXISTS idx_speech_policies_scope
  ON revenue_operator.speech_policies (domain_type, jurisdiction, channel);

-- speech_approvals (append-only)
CREATE TABLE IF NOT EXISTS revenue_operator.speech_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  object_type text NOT NULL CHECK (object_type IN ('template','policy')),
  object_id uuid NOT NULL,
  approved_version int NOT NULL,
  approved_by_user_id uuid,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_speech_approvals_object
  ON revenue_operator.speech_approvals (object_type, object_id);
CREATE INDEX IF NOT EXISTS idx_speech_approvals_workspace
  ON revenue_operator.speech_approvals (workspace_id, recorded_at DESC);

-- message_traces (append-only; no raw PII in slots_json)
CREATE TABLE IF NOT EXISTS revenue_operator.message_traces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  channel text NOT NULL,
  intent_type text NOT NULL,
  audience text,
  domain_type text,
  jurisdiction text,
  clause_plan_json jsonb,
  templates_used_json jsonb,
  slots_json jsonb,
  policy_versions_json jsonb,
  policy_checks_json jsonb,
  rendered_text text,
  result_status text NOT NULL CHECK (result_status IN ('prepared','sent','blocked','skipped','failed')),
  related_thread_id uuid REFERENCES revenue_operator.shared_transactions(id) ON DELETE SET NULL,
  related_work_unit_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_message_traces_workspace_created
  ON revenue_operator.message_traces (workspace_id, created_at DESC);

-- audit_log (append-only)
CREATE TABLE IF NOT EXISTS revenue_operator.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  actor_user_id uuid,
  actor_type text NOT NULL CHECK (actor_type IN ('user','system')),
  action_type text NOT NULL,
  details_json jsonb NOT NULL DEFAULT '{}',
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_workspace_recorded
  ON revenue_operator.audit_log (workspace_id, recorded_at DESC);

COMMENT ON TABLE revenue_operator.speech_templates IS 'Governed message templates; workspace_id NULL = global. Approved only via speech_approvals.';
COMMENT ON TABLE revenue_operator.speech_policies IS 'Policy rules per domain/jurisdiction/channel; policy_json schema in app.';
COMMENT ON TABLE revenue_operator.message_traces IS 'Append-only trace per outbound attempt; no PII in slots_json.';

COMMIT;
