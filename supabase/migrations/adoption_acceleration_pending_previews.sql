-- Pending action previews (visibility before first execution per action type)
BEGIN;

CREATE TABLE IF NOT EXISTS revenue_operator.pending_action_previews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  preview_text text NOT NULL,
  will_execute_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, action_type)
);

CREATE INDEX IF NOT EXISTS idx_pending_action_previews_workspace
  ON revenue_operator.pending_action_previews (workspace_id);

COMMIT;
