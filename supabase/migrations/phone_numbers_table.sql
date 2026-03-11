-- Phase 2 Task 9: phone_numbers table for self-serve provisioning
-- One workspace can have multiple numbers; each can be assigned to an agent.

CREATE TABLE IF NOT EXISTS revenue_operator.phone_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  friendly_name TEXT,
  country_code TEXT NOT NULL DEFAULT 'US',
  number_type TEXT NOT NULL DEFAULT 'local' CHECK (number_type IN ('local', 'toll_free', 'mobile')),
  capabilities JSONB NOT NULL DEFAULT '{"voice": true, "sms": true, "mms": false}',
  provider TEXT NOT NULL DEFAULT 'vapi',
  provider_sid TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'released', 'porting')),
  monthly_cost_cents INTEGER NOT NULL DEFAULT 150,
  assigned_agent_id UUID REFERENCES revenue_operator.agents(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(phone_number)
);

ALTER TABLE revenue_operator.phone_numbers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_isolation_phone_numbers" ON revenue_operator.phone_numbers
  FOR ALL
  USING (
    workspace_id IN (SELECT id FROM revenue_operator.workspaces WHERE owner_id = auth.uid())
    OR workspace_id IN (SELECT workspace_id FROM revenue_operator.workspace_roles WHERE user_id = auth.uid())
  );

CREATE INDEX idx_phone_numbers_workspace ON revenue_operator.phone_numbers(workspace_id);
CREATE INDEX idx_phone_numbers_assigned_agent ON revenue_operator.phone_numbers(assigned_agent_id);

COMMENT ON TABLE revenue_operator.phone_numbers IS 'Self-serve provisioned numbers; link to agents and phone_configs as needed';
