-- Risk Surface, Phone Continuity, Billing, Coverage Modules
-- Run after call_aware_zoom, final_polish

BEGIN;

-- Workspaces: billing + protection renewal
ALTER TABLE revenue_operator.workspaces
  ADD COLUMN IF NOT EXISTS protection_renewal_at timestamptz,
  ADD COLUMN IF NOT EXISTS billing_status text DEFAULT 'trial',
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text;

-- Phone configs
CREATE TABLE IF NOT EXISTS revenue_operator.phone_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL UNIQUE REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  mode text NOT NULL DEFAULT 'proxy',
  proxy_number text,
  forwarding_number text,
  twilio_account_sid text,
  twilio_phone_sid text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Rep numbers (optional for teams)
CREATE TABLE IF NOT EXISTS revenue_operator.rep_numbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  user_id uuid,
  forwarding_number text NOT NULL,
  proxy_number text,
  created_at timestamptz DEFAULT now()
);

-- Settings: coverage_flags
ALTER TABLE revenue_operator.settings
  ADD COLUMN IF NOT EXISTS coverage_flags jsonb DEFAULT '{"continuity_messaging":true,"booking_protection":true,"attendance_protection":true,"post_call_continuity":true,"notifications":true}';

-- Risk surface incidents (for Reports "prevented this week")
CREATE TABLE IF NOT EXISTS revenue_operator.risk_surface_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  risk_type text NOT NULL,
  lead_id uuid REFERENCES revenue_operator.leads(id) ON DELETE SET NULL,
  call_session_id uuid REFERENCES revenue_operator.call_sessions(id) ON DELETE SET NULL,
  prevented_at timestamptz DEFAULT now(),
  detail jsonb DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_risk_surface_workspace_prevented
  ON revenue_operator.risk_surface_incidents (workspace_id, prevented_at);

COMMIT;
