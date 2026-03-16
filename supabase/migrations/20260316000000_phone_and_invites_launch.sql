-- Final launch: phone_numbers billing columns + workspace_invites for team invitations.
-- Safe to run on existing DBs (ADD COLUMN IF NOT EXISTS / CREATE TABLE IF NOT EXISTS).

-- Phone numbers: ensure billing columns exist (for DBs created before phone_numbers_table had these)
ALTER TABLE revenue_operator.phone_numbers
  ADD COLUMN IF NOT EXISTS setup_fee_cents INTEGER NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS last_billed_at TIMESTAMPTZ;

UPDATE revenue_operator.phone_numbers
SET monthly_cost_cents = 300
WHERE monthly_cost_cents = 150;

-- Workspace invites for team invitations (email-based). Create if not exists.
CREATE TABLE IF NOT EXISTS revenue_operator.workspace_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE revenue_operator.workspace_invites ENABLE ROW LEVEL SECURITY;
