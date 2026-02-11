-- Revenue Operator: Full schema setup
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor)
-- Project: your project (ucjbsftixnnbmuodholg)

BEGIN;

-- 1. Create schema
CREATE SCHEMA IF NOT EXISTS revenue_operator;

-- 2. Create enums
DO $$ BEGIN
  CREATE TYPE revenue_operator.lead_state AS ENUM (
    'NEW','CONTACTED','ENGAGED','QUALIFIED','BOOKED','SHOWED','WON','LOST','RETAIN','REACTIVATE','CLOSED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE revenue_operator.call_node AS ENUM ('intro','situation','impact','qualification','routing');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE revenue_operator.autonomy_level AS ENUM ('observe','suggest','assisted','auto');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE revenue_operator.event_type AS ENUM (
    'message_received','no_reply_timeout','booking_created','call_completed','payment_detected','manual_update','no_show_reminder'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. Users (no FK - syncs with auth.users)
CREATE TABLE IF NOT EXISTS revenue_operator.users (
  id uuid PRIMARY KEY,
  email text NOT NULL,
  full_name text,
  stripe_customer_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. Workspaces
CREATE TABLE IF NOT EXISTS revenue_operator.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_id uuid NOT NULL REFERENCES revenue_operator.users(id),
  settings jsonb DEFAULT '{}',
  autonomy_level revenue_operator.autonomy_level DEFAULT 'assisted',
  working_hours jsonb DEFAULT '{"end":"17:00","days":[1,2,3,4,5],"start":"09:00","timezone":"UTC"}',
  kill_switch boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  status text DEFAULT 'active',
  paused_at timestamptz,
  pause_reason text
);

-- 5. Settings
CREATE TABLE IF NOT EXISTS revenue_operator.settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL UNIQUE REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  risk_level text NOT NULL DEFAULT 'balanced',
  business_hours jsonb NOT NULL DEFAULT '{"end":"17:00","days":[1,2,3,4,5],"start":"09:00","timezone":"UTC"}',
  forbidden_phrases jsonb NOT NULL DEFAULT '[]',
  vip_rules jsonb NOT NULL DEFAULT '{"domains":[],"exclude_from_calls":false,"exclude_from_messaging":false}',
  channel_rules jsonb NOT NULL DEFAULT '{}',
  opt_out_keywords jsonb NOT NULL DEFAULT '["stop","unsubscribe","opt out"]',
  safe_fallback_action text NOT NULL DEFAULT 'clarifying_question',
  min_message_interval_sec integer DEFAULT 300,
  max_messages_per_day integer DEFAULT 3,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 6. Leads
CREATE TABLE IF NOT EXISTS revenue_operator.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  external_id text,
  channel text,
  email text,
  phone text,
  name text,
  company text,
  state revenue_operator.lead_state NOT NULL DEFAULT 'NEW',
  metadata jsonb DEFAULT '{}',
  detected_behaviour text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_activity_at timestamptz DEFAULT now(),
  is_vip boolean DEFAULT false,
  qualification_score numeric,
  opt_out boolean DEFAULT false,
  UNIQUE(workspace_id, external_id)
);

-- 7. Conversations
CREATE TABLE IF NOT EXISTS revenue_operator.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES revenue_operator.leads(id) ON DELETE CASCADE,
  channel text NOT NULL,
  external_thread_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(lead_id, channel, external_thread_id)
);

-- 8. Messages
CREATE TABLE IF NOT EXISTS revenue_operator.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES revenue_operator.conversations(id) ON DELETE CASCADE,
  role text NOT NULL,
  content text NOT NULL,
  external_id text,
  metadata jsonb DEFAULT '{}',
  confidence_score numeric,
  approved_by_human boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- 9. Events
CREATE TABLE IF NOT EXISTS revenue_operator.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  event_type revenue_operator.event_type NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  payload jsonb DEFAULT '{}',
  trigger_source text,
  created_at timestamptz DEFAULT now()
);

-- 10. Automation states
CREATE TABLE IF NOT EXISTS revenue_operator.automation_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL UNIQUE REFERENCES revenue_operator.leads(id) ON DELETE CASCADE,
  state revenue_operator.lead_state NOT NULL,
  allowed_actions jsonb DEFAULT '[]',
  last_event_type revenue_operator.event_type,
  last_event_at timestamptz,
  no_reply_scheduled_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 11. Raw webhook events
CREATE TABLE IF NOT EXISTS revenue_operator.raw_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dedupe_key text NOT NULL UNIQUE,
  workspace_id uuid,
  payload jsonb NOT NULL,
  source text NOT NULL DEFAULT 'inbound',
  processed boolean DEFAULT false,
  processed_at timestamptz,
  error text,
  retry_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 12. Replay defense
CREATE TABLE IF NOT EXISTS revenue_operator.replay_defense (
  workspace_id uuid NOT NULL,
  signature text NOT NULL,
  timestamp_ms bigint NOT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY(workspace_id, signature, timestamp_ms)
);

-- 13. Job queue
CREATE TABLE IF NOT EXISTS revenue_operator.job_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type text NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  attempts integer DEFAULT 0,
  max_attempts integer DEFAULT 3,
  error text,
  processed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- 14. Rate limits
CREATE TABLE IF NOT EXISTS revenue_operator.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL,
  key_hash text NOT NULL,
  count integer DEFAULT 1,
  window_start timestamptz DEFAULT now(),
  UNIQUE(scope, key_hash)
);

-- 15. Outbound messages
CREATE TABLE IF NOT EXISTS revenue_operator.outbound_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES revenue_operator.leads(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES revenue_operator.conversations(id) ON DELETE CASCADE,
  content text NOT NULL,
  channel text NOT NULL,
  status text NOT NULL DEFAULT 'sent',
  sent_at timestamptz DEFAULT now(),
  delivery_error text,
  attempt_count integer DEFAULT 1
);

-- 16. Action logs
CREATE TABLE IF NOT EXISTS revenue_operator.action_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  action text NOT NULL,
  actor text NOT NULL,
  payload jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- 17. Metrics
CREATE TABLE IF NOT EXISTS revenue_operator.metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid,
  metric_key text NOT NULL,
  metric_value numeric NOT NULL DEFAULT 0,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  meta jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- 18. Deals
CREATE TABLE IF NOT EXISTS revenue_operator.deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES revenue_operator.leads(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  value_cents integer DEFAULT 0,
  currency text DEFAULT 'USD',
  status text DEFAULT 'open',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  closed_at timestamptz
);

-- 19. Attribution records
CREATE TABLE IF NOT EXISTS revenue_operator.attribution_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES revenue_operator.deals(id) ON DELETE CASCADE,
  milestone text NOT NULL,
  occurred_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'
);

-- 20. Payment records
CREATE TABLE IF NOT EXISTS revenue_operator.payment_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  deal_id uuid REFERENCES revenue_operator.deals(id) ON DELETE SET NULL,
  amount_cents integer NOT NULL,
  currency text DEFAULT 'USD',
  stripe_payment_id text,
  metadata jsonb DEFAULT '{}',
  detected_at timestamptz DEFAULT now()
);

-- 21. Invoices
CREATE TABLE IF NOT EXISTS revenue_operator.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  attributable_revenue_cents integer DEFAULT 0,
  fee_percent numeric DEFAULT 0,
  fee_cents integer DEFAULT 0,
  stripe_invoice_id text,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz DEFAULT now(),
  paid_at timestamptz
);

-- 22. Invoice items
CREATE TABLE IF NOT EXISTS revenue_operator.invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES revenue_operator.invoices(id) ON DELETE CASCADE,
  lead_id uuid,
  amount_cents integer NOT NULL,
  evidence_chain jsonb NOT NULL DEFAULT '{}',
  dispute_until timestamptz,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

-- 23. Channel capabilities
CREATE TABLE IF NOT EXISTS revenue_operator.channel_capabilities (
  channel text PRIMARY KEY,
  can_send boolean DEFAULT true,
  can_receive boolean DEFAULT true,
  can_call boolean DEFAULT false,
  supports_optout boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 24. Seed channel capabilities
INSERT INTO revenue_operator.channel_capabilities (channel, can_send, can_receive, can_call, supports_optout)
VALUES 
  ('email', true, true, false, true),
  ('sms', true, true, false, true),
  ('whatsapp', true, true, false, true),
  ('web', true, true, false, true)
ON CONFLICT (channel) DO NOTHING;

-- 25. Workspace members, call_sessions, pending_approvals (optional tables)
CREATE TABLE IF NOT EXISTS revenue_operator.workspace_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES revenue_operator.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  created_at timestamptz DEFAULT now(),
  UNIQUE(workspace_id, user_id)
);

CREATE TABLE IF NOT EXISTS revenue_operator.call_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES revenue_operator.leads(id) ON DELETE CASCADE,
  deal_id uuid REFERENCES revenue_operator.deals(id) ON DELETE SET NULL,
  current_node revenue_operator.call_node DEFAULT 'intro',
  transcript jsonb DEFAULT '[]',
  summary text,
  outcome text,
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz
);

CREATE TABLE IF NOT EXISTS revenue_operator.pending_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES revenue_operator.leads(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES revenue_operator.conversations(id) ON DELETE CASCADE,
  proposed_message text NOT NULL,
  confidence_score numeric NOT NULL,
  intent_classification jsonb,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid
);

-- 26. Grant permissions
GRANT USAGE ON SCHEMA revenue_operator TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA revenue_operator TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA revenue_operator TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA revenue_operator GRANT ALL ON TABLES TO anon, authenticated, service_role;

COMMIT;

-- 27. Create initial user from auth (run after first sign-up, or use your auth user id):
--     INSERT INTO revenue_operator.users (id, email, full_name)
--     SELECT id, email, raw_user_meta_data->>'full_name' FROM auth.users LIMIT 1
--     ON CONFLICT (id) DO NOTHING;

-- 28. Add revenue_operator to Exposed schemas in Supabase Dashboard:
--     Project Settings → API → Exposed schemas → add "revenue_operator"
