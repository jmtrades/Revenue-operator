-- Layer 7: Enterprise governance superset. dual_approval_required, compliance_only_approval, timeout, archive.

BEGIN;

-- Extend approval_mode check on message_policies (add dual_approval_required, compliance_only_approval)
ALTER TABLE revenue_operator.message_policies
  DROP CONSTRAINT IF EXISTS message_policies_approval_mode_check;
ALTER TABLE revenue_operator.message_policies
  ADD CONSTRAINT message_policies_approval_mode_check
  CHECK (approval_mode IN (
    'autopilot', 'preview_required', 'approval_required', 'locked_script', 'jurisdiction_locked',
    'dual_approval_required', 'compliance_only_approval'
  ));

-- Workspace-level approval timeout and auto-escalate (enterprise_features_json or settings)
ALTER TABLE revenue_operator.settings
  ADD COLUMN IF NOT EXISTS approval_timeout_minutes int,
  ADD COLUMN IF NOT EXISTS auto_escalate_if_pending boolean DEFAULT false;

-- Immutable message archive (append-only; no deletes)
CREATE TABLE IF NOT EXISTS revenue_operator.immutable_message_archive (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  channel text NOT NULL,
  intent_type text NOT NULL,
  rendered_text text NOT NULL,
  disclaimer_lines_json jsonb NOT NULL DEFAULT '[]',
  policy_id uuid,
  sent_at timestamptz NOT NULL DEFAULT now(),
  thread_id uuid,
  conversation_id uuid,
  work_unit_id uuid
);

CREATE INDEX IF NOT EXISTS idx_immutable_message_archive_workspace_sent
  ON revenue_operator.immutable_message_archive (workspace_id, sent_at DESC);

COMMENT ON TABLE revenue_operator.immutable_message_archive IS 'Enterprise: immutable record of sent messages. Append-only; no deletes.';

COMMIT;
