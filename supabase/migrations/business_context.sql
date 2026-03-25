-- Business Context table for workspace-specific messaging context
-- Required for good replies that match business tone, offer, and constraints

BEGIN;

CREATE TABLE IF NOT EXISTS revenue_operator.workspace_business_context (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL UNIQUE REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  business_name text NOT NULL DEFAULT '',
  offer_summary text NOT NULL DEFAULT '', -- 1-2 lines describing what they offer
  ideal_customer text NOT NULL DEFAULT '', -- who it's for
  disqualifiers text DEFAULT '', -- who it's not for
  pricing_range text DEFAULT NULL, -- optional, can be "starts at ..."
  booking_link text DEFAULT NULL, -- required if booking is used
  faq jsonb DEFAULT '[]', -- array of {q, a}
  tone_guidelines jsonb DEFAULT '{"style": "calm", "formality": "professional"}', -- e.g. calm, direct, premium
  compliance_notes jsonb DEFAULT '[]', -- forbidden claims
  timezone text DEFAULT 'UTC',
  business_hours jsonb DEFAULT '{"monday": {"start": "09:00", "end": "17:00"}, "tuesday": {"start": "09:00", "end": "17:00"}, "wednesday": {"start": "09:00", "end": "17:00"}, "thursday": {"start": "09:00", "end": "17:00"}, "friday": {"start": "09:00", "end": "17:00"}}',
  negotiation_rules jsonb DEFAULT '{"discounts_allowed": false, "deposit_required": false, "payment_terms": null}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workspace_business_context_workspace_id ON revenue_operator.workspace_business_context(workspace_id);

COMMENT ON TABLE revenue_operator.workspace_business_context IS 'Business context per workspace for personalized, accurate messaging';
COMMENT ON COLUMN revenue_operator.workspace_business_context.offer_summary IS '1-2 line summary of what the business offers';
COMMENT ON COLUMN revenue_operator.workspace_business_context.booking_link IS 'Required if booking flow is used';
COMMENT ON COLUMN revenue_operator.workspace_business_context.negotiation_rules IS 'Rules for handling pricing objections and negotiations';

COMMIT;
