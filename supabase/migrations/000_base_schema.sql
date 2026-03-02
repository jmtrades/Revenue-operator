-- Base schema: must run before all other migrations. Creates schema, enums, users, workspaces, leads, settings, conversations.
-- Idempotent (IF NOT EXISTS). Matches setup-revenue-operator.sql.

BEGIN;

CREATE SCHEMA IF NOT EXISTS revenue_operator;

DO $$ BEGIN
  CREATE TYPE revenue_operator.lead_state AS ENUM (
    'NEW','CONTACTED','ENGAGED','QUALIFIED','BOOKED','SHOWED','WON','LOST','RETAIN','REACTIVATE','CLOSED'
  );
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

CREATE TABLE IF NOT EXISTS revenue_operator.users (
  id uuid PRIMARY KEY,
  email text NOT NULL,
  full_name text,
  stripe_customer_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

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

CREATE TABLE IF NOT EXISTS revenue_operator.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES revenue_operator.leads(id) ON DELETE CASCADE,
  channel text NOT NULL,
  external_thread_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(lead_id, channel, external_thread_id)
);

COMMIT;
