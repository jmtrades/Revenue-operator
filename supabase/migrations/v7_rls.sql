-- v7 RLS: optional. When using Supabase Auth, owner_id in workspaces = auth.uid().
-- Server uses service_role (bypasses RLS). Client using anon + user JWT will be restricted.

BEGIN;

-- Helper: true if current user owns the workspace (or is service_role)
CREATE OR REPLACE FUNCTION revenue_operator.workspace_owner_check(ws_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = revenue_operator
AS $$
  SELECT EXISTS (
    SELECT 1 FROM revenue_operator.workspaces w
    WHERE w.id = ws_id AND w.owner_id = auth.uid()
  ) OR (auth.role() = 'service_role');
$$;

ALTER TABLE revenue_operator.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_operator.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_operator.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_operator.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_operator.team_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agents_select" ON revenue_operator.agents;
CREATE POLICY "agents_select" ON revenue_operator.agents FOR SELECT USING (revenue_operator.workspace_owner_check(workspace_id));
DROP POLICY IF EXISTS "agents_insert" ON revenue_operator.agents;
CREATE POLICY "agents_insert" ON revenue_operator.agents FOR INSERT WITH CHECK (revenue_operator.workspace_owner_check(workspace_id));
DROP POLICY IF EXISTS "agents_update" ON revenue_operator.agents;
CREATE POLICY "agents_update" ON revenue_operator.agents FOR UPDATE USING (revenue_operator.workspace_owner_check(workspace_id));
DROP POLICY IF EXISTS "agents_delete" ON revenue_operator.agents;
CREATE POLICY "agents_delete" ON revenue_operator.agents FOR DELETE USING (revenue_operator.workspace_owner_check(workspace_id));

DROP POLICY IF EXISTS "campaigns_select" ON revenue_operator.campaigns;
CREATE POLICY "campaigns_select" ON revenue_operator.campaigns FOR SELECT USING (revenue_operator.workspace_owner_check(workspace_id));
DROP POLICY IF EXISTS "campaigns_insert" ON revenue_operator.campaigns;
CREATE POLICY "campaigns_insert" ON revenue_operator.campaigns FOR INSERT WITH CHECK (revenue_operator.workspace_owner_check(workspace_id));
DROP POLICY IF EXISTS "campaigns_update" ON revenue_operator.campaigns;
CREATE POLICY "campaigns_update" ON revenue_operator.campaigns FOR UPDATE USING (revenue_operator.workspace_owner_check(workspace_id));
DROP POLICY IF EXISTS "campaigns_delete" ON revenue_operator.campaigns;
CREATE POLICY "campaigns_delete" ON revenue_operator.campaigns FOR DELETE USING (revenue_operator.workspace_owner_check(workspace_id));

DROP POLICY IF EXISTS "appointments_select" ON revenue_operator.appointments;
CREATE POLICY "appointments_select" ON revenue_operator.appointments FOR SELECT USING (revenue_operator.workspace_owner_check(workspace_id));
DROP POLICY IF EXISTS "appointments_insert" ON revenue_operator.appointments;
CREATE POLICY "appointments_insert" ON revenue_operator.appointments FOR INSERT WITH CHECK (revenue_operator.workspace_owner_check(workspace_id));
DROP POLICY IF EXISTS "appointments_update" ON revenue_operator.appointments;
CREATE POLICY "appointments_update" ON revenue_operator.appointments FOR UPDATE USING (revenue_operator.workspace_owner_check(workspace_id));
DROP POLICY IF EXISTS "appointments_delete" ON revenue_operator.appointments;
CREATE POLICY "appointments_delete" ON revenue_operator.appointments FOR DELETE USING (revenue_operator.workspace_owner_check(workspace_id));

DROP POLICY IF EXISTS "messages_select" ON revenue_operator.messages;
CREATE POLICY "messages_select" ON revenue_operator.messages FOR SELECT USING (revenue_operator.workspace_owner_check(workspace_id));
DROP POLICY IF EXISTS "messages_insert" ON revenue_operator.messages;
CREATE POLICY "messages_insert" ON revenue_operator.messages FOR INSERT WITH CHECK (revenue_operator.workspace_owner_check(workspace_id));
DROP POLICY IF EXISTS "messages_update" ON revenue_operator.messages;
CREATE POLICY "messages_update" ON revenue_operator.messages FOR UPDATE USING (revenue_operator.workspace_owner_check(workspace_id));
DROP POLICY IF EXISTS "messages_delete" ON revenue_operator.messages;
CREATE POLICY "messages_delete" ON revenue_operator.messages FOR DELETE USING (revenue_operator.workspace_owner_check(workspace_id));

DROP POLICY IF EXISTS "team_members_select" ON revenue_operator.team_members;
CREATE POLICY "team_members_select" ON revenue_operator.team_members FOR SELECT USING (revenue_operator.workspace_owner_check(workspace_id));
DROP POLICY IF EXISTS "team_members_insert" ON revenue_operator.team_members;
CREATE POLICY "team_members_insert" ON revenue_operator.team_members FOR INSERT WITH CHECK (revenue_operator.workspace_owner_check(workspace_id));
DROP POLICY IF EXISTS "team_members_update" ON revenue_operator.team_members;
CREATE POLICY "team_members_update" ON revenue_operator.team_members FOR UPDATE USING (revenue_operator.workspace_owner_check(workspace_id));
DROP POLICY IF EXISTS "team_members_delete" ON revenue_operator.team_members;
CREATE POLICY "team_members_delete" ON revenue_operator.team_members FOR DELETE USING (revenue_operator.workspace_owner_check(workspace_id));

COMMIT;
