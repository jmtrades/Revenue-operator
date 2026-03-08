-- Add columns to workspace_invites for email-based team invites (invite by email, role, inviter, expiry).
-- Existing rows (enterprise link-only) keep NULLs for new columns.

ALTER TABLE revenue_operator.workspace_invites
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS role text DEFAULT 'agent',
  ADD COLUMN IF NOT EXISTS invited_by uuid,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

CREATE INDEX IF NOT EXISTS workspace_invites_email_workspace_idx
  ON revenue_operator.workspace_invites (workspace_id, email)
  WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS workspace_invites_status_expires_idx
  ON revenue_operator.workspace_invites (status, expires_at)
  WHERE status = 'pending';
