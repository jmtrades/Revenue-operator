-- Create outbound_campaigns table for the campaign wizard and launch flow.
-- The app code references this table alongside the original "campaigns" table;
-- outbound_campaigns stores the full settings/stats structure used by the
-- outbound dialer, cron processor, and campaign detail API.

CREATE TABLE IF NOT EXISTS revenue_operator.outbound_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Untitled Campaign',
  type text NOT NULL DEFAULT 'custom',
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'launching', 'active', 'paused', 'completed', 'cancelled', 'failed')),
  mode text NOT NULL DEFAULT 'preview'
    CHECK (mode IN ('preview', 'power', 'predictive')),
  from_number text,
  target_filter jsonb NOT NULL DEFAULT '{}'::jsonb,
  sequence_steps jsonb,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  stats jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_outbound_campaigns_workspace
  ON revenue_operator.outbound_campaigns(workspace_id);
CREATE INDEX IF NOT EXISTS idx_outbound_campaigns_status
  ON revenue_operator.outbound_campaigns(workspace_id, status);

COMMENT ON TABLE revenue_operator.outbound_campaigns IS 'Outbound campaign config used by campaign wizard, launch flow, and cron processor';

-- Campaign-lead junction table for tracking per-lead progress within a campaign.
CREATE TABLE IF NOT EXISTS revenue_operator.campaign_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES revenue_operator.outbound_campaigns(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES revenue_operator.leads(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'calling', 'called', 'sent', 'skipped', 'failed', 'dnc_blocked')),
  call_session_id uuid,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, lead_id)
);

CREATE INDEX IF NOT EXISTS idx_campaign_leads_campaign
  ON revenue_operator.campaign_leads(campaign_id, status);
CREATE INDEX IF NOT EXISTS idx_campaign_leads_lead
  ON revenue_operator.campaign_leads(lead_id);

COMMENT ON TABLE revenue_operator.campaign_leads IS 'Junction table tracking per-lead status within outbound campaigns';

-- RLS policies
ALTER TABLE revenue_operator.outbound_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_operator.campaign_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "outbound_campaigns_select" ON revenue_operator.outbound_campaigns;
CREATE POLICY "outbound_campaigns_select" ON revenue_operator.outbound_campaigns
  FOR SELECT USING (revenue_operator.workspace_owner_check(workspace_id));

DROP POLICY IF EXISTS "outbound_campaigns_insert" ON revenue_operator.outbound_campaigns;
CREATE POLICY "outbound_campaigns_insert" ON revenue_operator.outbound_campaigns
  FOR INSERT WITH CHECK (revenue_operator.workspace_owner_check(workspace_id));

DROP POLICY IF EXISTS "outbound_campaigns_update" ON revenue_operator.outbound_campaigns;
CREATE POLICY "outbound_campaigns_update" ON revenue_operator.outbound_campaigns
  FOR UPDATE USING (revenue_operator.workspace_owner_check(workspace_id));

DROP POLICY IF EXISTS "outbound_campaigns_delete" ON revenue_operator.outbound_campaigns;
CREATE POLICY "outbound_campaigns_delete" ON revenue_operator.outbound_campaigns
  FOR DELETE USING (revenue_operator.workspace_owner_check(workspace_id));

-- campaign_leads RLS: access if user owns the campaign's workspace
DROP POLICY IF EXISTS "campaign_leads_select" ON revenue_operator.campaign_leads;
CREATE POLICY "campaign_leads_select" ON revenue_operator.campaign_leads
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM revenue_operator.outbound_campaigns oc
      WHERE oc.id = campaign_leads.campaign_id
        AND revenue_operator.workspace_owner_check(oc.workspace_id)
    )
  );

DROP POLICY IF EXISTS "campaign_leads_insert" ON revenue_operator.campaign_leads;
CREATE POLICY "campaign_leads_insert" ON revenue_operator.campaign_leads
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM revenue_operator.outbound_campaigns oc
      WHERE oc.id = campaign_leads.campaign_id
        AND revenue_operator.workspace_owner_check(oc.workspace_id)
    )
  );

DROP POLICY IF EXISTS "campaign_leads_update" ON revenue_operator.campaign_leads;
CREATE POLICY "campaign_leads_update" ON revenue_operator.campaign_leads
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM revenue_operator.outbound_campaigns oc
      WHERE oc.id = campaign_leads.campaign_id
        AND revenue_operator.workspace_owner_check(oc.workspace_id)
    )
  );

DROP POLICY IF EXISTS "campaign_leads_delete" ON revenue_operator.campaign_leads;
CREATE POLICY "campaign_leads_delete" ON revenue_operator.campaign_leads
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM revenue_operator.outbound_campaigns oc
      WHERE oc.id = campaign_leads.campaign_id
        AND revenue_operator.workspace_owner_check(oc.workspace_id)
    )
  );
