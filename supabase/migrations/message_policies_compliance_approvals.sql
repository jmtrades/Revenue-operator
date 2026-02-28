-- Phase 1: Message policy registry, compliance packs, message approval queue.
-- Append-only where specified. Doctrine-safe.

BEGIN;

-- message_policies: deterministic (workspace, domain, channel, intent) -> template + disclaimers + approval_mode
CREATE TABLE IF NOT EXISTS revenue_operator.message_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  domain_type text NOT NULL DEFAULT 'general',
  jurisdiction text NOT NULL DEFAULT 'UK',
  channel text NOT NULL CHECK (channel IN ('sms','email','whatsapp')),
  intent_type text NOT NULL,
  template_id uuid REFERENCES revenue_operator.speech_templates(id) ON DELETE SET NULL,
  required_disclaimers jsonb NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(required_disclaimers) = 'array'),
  forbidden_phrases jsonb NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(forbidden_phrases) = 'array'),
  required_phrases jsonb NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(required_phrases) = 'array'),
  locale_region text,
  approval_mode text NOT NULL DEFAULT 'autopilot'
    CHECK (approval_mode IN ('autopilot','preview_required','approval_required','locked_script')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_message_policies_scope
  ON revenue_operator.message_policies (
    COALESCE(workspace_id, '00000000-0000-0000-0000-000000000000'::uuid),
    domain_type,
    jurisdiction,
    channel,
    intent_type
  );
CREATE INDEX IF NOT EXISTS idx_message_policies_workspace
  ON revenue_operator.message_policies (workspace_id) WHERE workspace_id IS NOT NULL;

-- compliance_packs: industry + region rules (disclaimers, forbidden claims, consent, quiet hours, opt-out)
CREATE TABLE IF NOT EXISTS revenue_operator.compliance_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  industry_type text NOT NULL,
  region_state text,
  rules_json jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_compliance_packs_workspace
  ON revenue_operator.compliance_packs (workspace_id);
CREATE INDEX IF NOT EXISTS idx_compliance_packs_industry
  ON revenue_operator.compliance_packs (workspace_id, industry_type);

-- message_approvals: queue for messages held for approval (append-only status transitions)
CREATE TABLE IF NOT EXISTS revenue_operator.message_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  conversation_id uuid,
  work_unit_id uuid,
  thread_id uuid REFERENCES revenue_operator.shared_transactions(id) ON DELETE SET NULL,
  proposed_message text NOT NULL,
  template_id uuid REFERENCES revenue_operator.speech_templates(id) ON DELETE SET NULL,
  policy_id uuid REFERENCES revenue_operator.message_policies(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','expired')),
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  decided_by uuid
);

CREATE INDEX IF NOT EXISTS idx_message_approvals_workspace_pending
  ON revenue_operator.message_approvals (workspace_id, created_at DESC)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_message_approvals_workspace
  ON revenue_operator.message_approvals (workspace_id);

COMMENT ON TABLE revenue_operator.message_policies IS 'Registry: (workspace, domain, channel, intent) -> template + disclaimers + approval_mode. Deterministic resolution.';
COMMENT ON TABLE revenue_operator.compliance_packs IS 'Industry/region rules: disclaimers, forbidden claims, consent, quiet hours, opt-out.';
COMMENT ON TABLE revenue_operator.message_approvals IS 'Queue: messages held for human approval; status transitions only.';

COMMIT;
