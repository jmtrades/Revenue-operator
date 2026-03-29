-- Enable RLS on base schema tables that were missing it.
-- Server uses service_role (bypasses RLS). Client-facing queries are restricted.

BEGIN;

-- workspaces: owner can see their own
ALTER TABLE revenue_operator.workspaces ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "workspaces_select" ON revenue_operator.workspaces;
CREATE POLICY "workspaces_select" ON revenue_operator.workspaces FOR SELECT
  USING (owner_id = auth.uid() OR (auth.role() = 'service_role'));
DROP POLICY IF EXISTS "workspaces_update" ON revenue_operator.workspaces;
CREATE POLICY "workspaces_update" ON revenue_operator.workspaces FOR UPDATE
  USING (owner_id = auth.uid() OR (auth.role() = 'service_role'));

-- users: can only see own record
ALTER TABLE revenue_operator.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_select" ON revenue_operator.users;
CREATE POLICY "users_select" ON revenue_operator.users FOR SELECT
  USING (id = auth.uid() OR (auth.role() = 'service_role'));
DROP POLICY IF EXISTS "users_update" ON revenue_operator.users;
CREATE POLICY "users_update" ON revenue_operator.users FOR UPDATE
  USING (id = auth.uid() OR (auth.role() = 'service_role'));

-- settings: workspace-scoped
ALTER TABLE revenue_operator.settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "settings_select" ON revenue_operator.settings;
CREATE POLICY "settings_select" ON revenue_operator.settings FOR SELECT
  USING (revenue_operator.workspace_owner_check(workspace_id));
DROP POLICY IF EXISTS "settings_insert" ON revenue_operator.settings;
CREATE POLICY "settings_insert" ON revenue_operator.settings FOR INSERT
  WITH CHECK (revenue_operator.workspace_owner_check(workspace_id));
DROP POLICY IF EXISTS "settings_update" ON revenue_operator.settings;
CREATE POLICY "settings_update" ON revenue_operator.settings FOR UPDATE
  USING (revenue_operator.workspace_owner_check(workspace_id));

-- leads: workspace-scoped
ALTER TABLE revenue_operator.leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "leads_select" ON revenue_operator.leads;
CREATE POLICY "leads_select" ON revenue_operator.leads FOR SELECT
  USING (revenue_operator.workspace_owner_check(workspace_id));
DROP POLICY IF EXISTS "leads_insert" ON revenue_operator.leads;
CREATE POLICY "leads_insert" ON revenue_operator.leads FOR INSERT
  WITH CHECK (revenue_operator.workspace_owner_check(workspace_id));
DROP POLICY IF EXISTS "leads_update" ON revenue_operator.leads;
CREATE POLICY "leads_update" ON revenue_operator.leads FOR UPDATE
  USING (revenue_operator.workspace_owner_check(workspace_id));
DROP POLICY IF EXISTS "leads_delete" ON revenue_operator.leads;
CREATE POLICY "leads_delete" ON revenue_operator.leads FOR DELETE
  USING (revenue_operator.workspace_owner_check(workspace_id));

-- conversations: workspace-scoped (via lead → workspace)
ALTER TABLE revenue_operator.conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "conversations_select" ON revenue_operator.conversations;
CREATE POLICY "conversations_select" ON revenue_operator.conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM revenue_operator.leads l
      WHERE l.id = lead_id AND revenue_operator.workspace_owner_check(l.workspace_id)
    ) OR (auth.role() = 'service_role')
  );
DROP POLICY IF EXISTS "conversations_insert" ON revenue_operator.conversations;
CREATE POLICY "conversations_insert" ON revenue_operator.conversations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM revenue_operator.leads l
      WHERE l.id = lead_id AND revenue_operator.workspace_owner_check(l.workspace_id)
    ) OR (auth.role() = 'service_role')
  );
DROP POLICY IF EXISTS "conversations_update" ON revenue_operator.conversations;
CREATE POLICY "conversations_update" ON revenue_operator.conversations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM revenue_operator.leads l
      WHERE l.id = lead_id AND revenue_operator.workspace_owner_check(l.workspace_id)
    ) OR (auth.role() = 'service_role')
  );

COMMIT;
