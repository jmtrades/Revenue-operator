-- Final Adoption & Dependency Upgrade
-- Additive only. Run after setup-revenue-operator.sql

BEGIN;

-- 1. Escalation rules (stored in settings as jsonb, no new table)
-- Settings already has jsonb; we use escalation_rules in settings.

-- 2. Calendar/slot metadata on deals
ALTER TABLE revenue_operator.deals
  ADD COLUMN IF NOT EXISTS slot_quality_score numeric,
  ADD COLUMN IF NOT EXISTS scheduling_reason text;

-- 3. Commitment tracking
ALTER TABLE revenue_operator.leads
  ADD COLUMN IF NOT EXISTS commitment_score numeric DEFAULT 0;

CREATE TABLE IF NOT EXISTS revenue_operator.commitment_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES revenue_operator.leads(id) ON DELETE CASCADE,
  signal_type text NOT NULL,
  payload jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- 4. Webhook config in settings (via jsonb) + outbound events log
CREATE TABLE IF NOT EXISTS revenue_operator.webhook_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL UNIQUE REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  endpoint_url text NOT NULL,
  secret text,
  event_types text[] DEFAULT ARRAY['lead_qualified','call_booked','deal_at_risk','deal_won','lead_reactivated'],
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS revenue_operator.outbound_events_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  entity_id uuid,
  payload jsonb DEFAULT '{}',
  webhook_sent boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- 5. Business memory
CREATE TABLE IF NOT EXISTS revenue_operator.business_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  memory_type text NOT NULL,
  content jsonb NOT NULL DEFAULT '{}',
  source text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(workspace_id, memory_type)
);

-- 6. Activation state for guided onboarding
CREATE TABLE IF NOT EXISTS revenue_operator.activation_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL UNIQUE REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  step text NOT NULL DEFAULT 'scan',
  opportunities_found integer DEFAULT 0,
  simulated_actions_count integer DEFAULT 0,
  activated_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 7. Escalations log (for suggest-not-send)
CREATE TABLE IF NOT EXISTS revenue_operator.escalation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES revenue_operator.leads(id) ON DELETE CASCADE,
  escalation_reason text NOT NULL,
  proposed_action text,
  proposed_message text,
  assigned_user_id uuid,
  notified_at timestamptz,
  created_at timestamptz DEFAULT now()
);

COMMIT;
