-- Layer 4: Channel policy — primary/fallback/escalation per intent, quiet hours.
-- No uncontrolled dispatching.

BEGIN;

CREATE TABLE IF NOT EXISTS revenue_operator.channel_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  intent_type text NOT NULL,
  primary_channel text NOT NULL CHECK (primary_channel IN ('sms','email','whatsapp','voice','instagram_dm','web_chat','voicemail_drop')),
  fallback_channel text CHECK (fallback_channel IS NULL OR fallback_channel IN ('sms','email','whatsapp','voice','instagram_dm','web_chat','voicemail_drop')),
  escalation_channel text NOT NULL CHECK (escalation_channel IN ('sms','email','whatsapp','voice','instagram_dm','web_chat','voicemail_drop')),
  quiet_hours_enforced boolean NOT NULL DEFAULT true,
  quiet_hours_tz text,
  quiet_hours_start text,
  quiet_hours_end text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, intent_type)
);

CREATE INDEX IF NOT EXISTS idx_channel_policies_workspace
  ON revenue_operator.channel_policies (workspace_id);

COMMENT ON TABLE revenue_operator.channel_policies IS 'Channel selection per intent; fallback and escalation; quiet hour enforcement.';

COMMIT;
