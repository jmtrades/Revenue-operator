-- Add agent control center columns to workspaces table
-- These support the new Behavior, Escalation, Actions, and Objection Handling settings

ALTER TABLE revenue_operator.workspaces
  ADD COLUMN IF NOT EXISTS qualification_method text NOT NULL DEFAULT 'None',
  ADD COLUMN IF NOT EXISTS custom_qualification_questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS tone_preset text NOT NULL DEFAULT 'Professional',
  ADD COLUMN IF NOT EXISTS transfer_policy text NOT NULL DEFAULT 'If caller requests',
  ADD COLUMN IF NOT EXISTS transfer_number text,
  ADD COLUMN IF NOT EXISTS escalation_threshold text NOT NULL DEFAULT 'Balanced',
  ADD COLUMN IF NOT EXISTS escalation_triggers text,
  ADD COLUMN IF NOT EXISTS allowed_actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS forbidden_actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS objections jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN revenue_operator.workspaces.qualification_method IS 'Lead qualification method: None, BANT, or Custom Questions';
COMMENT ON COLUMN revenue_operator.workspaces.tone_preset IS 'Agent conversation tone: Professional, Casual & Friendly, Concise & Direct, Empathetic & Warm';
COMMENT ON COLUMN revenue_operator.workspaces.transfer_policy IS 'When to transfer calls: Never, If caller requests, On escalation trigger, Always';
COMMENT ON COLUMN revenue_operator.workspaces.escalation_threshold IS 'AI confidence threshold: Conservative, Balanced, Aggressive';
COMMENT ON COLUMN revenue_operator.workspaces.objections IS 'JSON array of {objection, response} pairs for agent objection handling';
