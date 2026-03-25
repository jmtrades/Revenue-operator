-- Enterprise immutability: append-only decision chain and compliance locks for message approvals.

BEGIN;

CREATE TABLE IF NOT EXISTS revenue_operator.message_approval_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  approval_id uuid NOT NULL REFERENCES revenue_operator.message_approvals(id) ON DELETE CASCADE,
  decision text NOT NULL CHECK (decision IN ('approved','rejected')),
  decided_by uuid,
  decided_role text,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, approval_id, decided_by)
);

CREATE INDEX IF NOT EXISTS idx_message_approval_decisions_workspace_approval
  ON revenue_operator.message_approval_decisions (workspace_id, approval_id, recorded_at);

COMMENT ON TABLE revenue_operator.message_approval_decisions IS 'Append-only decision chain for message approvals (enterprise immutability).';

CREATE TABLE IF NOT EXISTS revenue_operator.message_approval_locks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  approval_id uuid NOT NULL REFERENCES revenue_operator.message_approvals(id) ON DELETE CASCADE,
  locked_until timestamptz NOT NULL,
  reason text NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_message_approval_locks_workspace_approval
  ON revenue_operator.message_approval_locks (workspace_id, approval_id, locked_until);

COMMENT ON TABLE revenue_operator.message_approval_locks IS 'Compliance locks for message approvals (cooldown after override). Append-only.';

COMMIT;

