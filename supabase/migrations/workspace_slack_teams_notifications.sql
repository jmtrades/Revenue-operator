-- Slack/Teams notifications (Task 24): workspace config and per-type channel prefs.

BEGIN;

CREATE TABLE IF NOT EXISTS revenue_operator.workspace_slack_config (
  workspace_id uuid PRIMARY KEY REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  access_token_encrypted text,
  team_id text,
  team_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS revenue_operator.workspace_teams_config (
  workspace_id uuid PRIMARY KEY REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  webhook_url_encrypted text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS revenue_operator.workspace_notification_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  notification_type text NOT NULL CHECK (notification_type IN (
    'new_lead', 'call_summary', 'daily_digest', 'quality_alert', 'appointment_reminder'
  )),
  provider text NOT NULL CHECK (provider IN ('slack', 'teams')),
  slack_channel_id text,
  slack_channel_name text,
  teams_webhook_url_encrypted text,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, notification_type, provider)
);

CREATE INDEX IF NOT EXISTS idx_workspace_notification_channels_workspace
  ON revenue_operator.workspace_notification_channels(workspace_id);

ALTER TABLE revenue_operator.workspace_slack_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_operator.workspace_teams_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_operator.workspace_notification_channels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workspace_slack_config_all" ON revenue_operator.workspace_slack_config;
CREATE POLICY "workspace_slack_config_all" ON revenue_operator.workspace_slack_config FOR ALL
  USING (revenue_operator.workspace_owner_check(workspace_id))
  WITH CHECK (revenue_operator.workspace_owner_check(workspace_id));

DROP POLICY IF EXISTS "workspace_teams_config_all" ON revenue_operator.workspace_teams_config;
CREATE POLICY "workspace_teams_config_all" ON revenue_operator.workspace_teams_config FOR ALL
  USING (revenue_operator.workspace_owner_check(workspace_id))
  WITH CHECK (revenue_operator.workspace_owner_check(workspace_id));

DROP POLICY IF EXISTS "workspace_notification_channels_all" ON revenue_operator.workspace_notification_channels;
CREATE POLICY "workspace_notification_channels_all" ON revenue_operator.workspace_notification_channels FOR ALL
  USING (revenue_operator.workspace_owner_check(workspace_id))
  WITH CHECK (revenue_operator.workspace_owner_check(workspace_id));

COMMIT;
