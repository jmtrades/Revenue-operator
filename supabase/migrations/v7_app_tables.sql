-- v7 App tables: agents, campaigns, appointments, messages, team_members
-- Part 7 data model. All scoped by workspace_id (business = workspace).

BEGIN;

-- Agents: AI phone agents per workspace
CREATE TABLE IF NOT EXISTS revenue_operator.agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  voice_id text,
  personality text NOT NULL DEFAULT 'professional' CHECK (personality IN ('friendly', 'professional', 'casual', 'empathetic')),
  purpose text NOT NULL DEFAULT 'inbound' CHECK (purpose IN ('inbound', 'outbound', 'both')),
  greeting text NOT NULL DEFAULT '',
  knowledge_base jsonb NOT NULL DEFAULT '{}',
  conversation_flow jsonb,
  rules jsonb NOT NULL DEFAULT '{"neverSay": [], "alwaysTransfer": [], "escalationChain": []}',
  is_active boolean NOT NULL DEFAULT true,
  vapi_agent_id text,
  stats jsonb NOT NULL DEFAULT '{"totalCalls": 0, "avgRating": 0, "appointmentsBooked": 0}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_agents_workspace ON revenue_operator.agents(workspace_id);
CREATE INDEX IF NOT EXISTS idx_agents_active ON revenue_operator.agents(workspace_id, is_active) WHERE is_active = true;

-- Campaigns: outbound campaign config
CREATE TABLE IF NOT EXISTS revenue_operator.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL REFERENCES revenue_operator.agents(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'lead_followup' CHECK (type IN (
    'lead_followup', 'appointment_reminder', 'payment_reminder', 'reactivation',
    'cold_outreach', 'review_request', 'no_show_recovery', 'post_service', 'survey', 'custom'
  )),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
  target_filter jsonb,
  contact_list_id uuid,
  trigger_type text NOT NULL DEFAULT 'manual' CHECK (trigger_type IN ('manual', 'auto')),
  trigger_event text,
  schedule jsonb,
  retry_attempts int NOT NULL DEFAULT 3,
  retry_delay_minutes int NOT NULL DEFAULT 60,
  on_answered jsonb,
  on_voicemail jsonb,
  on_no_answer jsonb,
  on_declined jsonb,
  total_contacts int NOT NULL DEFAULT 0,
  called int NOT NULL DEFAULT 0,
  answered int NOT NULL DEFAULT 0,
  appointments_booked int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_campaigns_workspace ON revenue_operator.campaigns(workspace_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON revenue_operator.campaigns(workspace_id, status);

-- Appointments: booked appointments (links to lead and call)
CREATE TABLE IF NOT EXISTS revenue_operator.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES revenue_operator.leads(id) ON DELETE CASCADE,
  call_id uuid,
  title text NOT NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  location text,
  notes text,
  status text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed', 'no_show')),
  external_calendar_id text,
  reminders_sent text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_appointments_workspace ON revenue_operator.appointments(workspace_id);
CREATE INDEX IF NOT EXISTS idx_appointments_lead ON revenue_operator.appointments(lead_id);
CREATE INDEX IF NOT EXISTS idx_appointments_start ON revenue_operator.appointments(workspace_id, start_time);

-- Messages: SMS/email sent or received (v7 shape). If table already exists (e.g. from setup) with conversation_id shape, add v7 columns.
CREATE TABLE IF NOT EXISTS revenue_operator.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES revenue_operator.leads(id) ON DELETE CASCADE,
  direction text NOT NULL CHECK (direction IN ('outbound', 'inbound')),
  channel text NOT NULL CHECK (channel IN ('sms', 'email')),
  content text NOT NULL,
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'failed')),
  trigger text DEFAULT 'manual' CHECK (trigger IN (
    'auto_confirmation', 'auto_reminder', 'auto_followup', 'auto_review', 'campaign', 'manual', 'ai_response'
  )),
  call_id uuid,
  sent_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE revenue_operator.messages ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE;
ALTER TABLE revenue_operator.messages ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES revenue_operator.leads(id) ON DELETE CASCADE;
ALTER TABLE revenue_operator.messages ADD COLUMN IF NOT EXISTS direction text;
ALTER TABLE revenue_operator.messages ADD COLUMN IF NOT EXISTS channel text;
ALTER TABLE revenue_operator.messages ADD COLUMN IF NOT EXISTS status text DEFAULT 'sent';
ALTER TABLE revenue_operator.messages ADD COLUMN IF NOT EXISTS trigger text DEFAULT 'manual';
ALTER TABLE revenue_operator.messages ADD COLUMN IF NOT EXISTS call_id uuid;
ALTER TABLE revenue_operator.messages ADD COLUMN IF NOT EXISTS sent_at timestamptz DEFAULT now();
CREATE INDEX IF NOT EXISTS idx_messages_workspace ON revenue_operator.messages(workspace_id) WHERE workspace_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_lead ON revenue_operator.messages(lead_id) WHERE lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_sent_at ON revenue_operator.messages(workspace_id, sent_at DESC) WHERE workspace_id IS NOT NULL;

-- Team members: optional link to auth user
CREATE TABLE IF NOT EXISTS revenue_operator.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  user_id uuid,
  name text NOT NULL,
  phone text,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'operator' CHECK (role IN ('owner', 'admin', 'operator')),
  specialties text[],
  availability jsonb,
  is_on_call boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, email)
);
CREATE INDEX IF NOT EXISTS idx_team_members_workspace ON revenue_operator.team_members(workspace_id);

COMMENT ON TABLE revenue_operator.agents IS 'v7: AI phone agents per workspace';
COMMENT ON TABLE revenue_operator.campaigns IS 'v7: Outbound campaign config';
COMMENT ON TABLE revenue_operator.appointments IS 'v7: Booked appointments';
COMMENT ON TABLE revenue_operator.messages IS 'v7: SMS/email messages';
COMMENT ON TABLE revenue_operator.team_members IS 'v7: Team members per workspace';

COMMIT;
