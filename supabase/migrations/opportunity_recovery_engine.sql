-- Opportunity Recovery Engine: momentum detection and revival above commitment layer.
-- Detects decay (slowing/stalled) and revives before lost. authority_required after 3 failed revivals.

BEGIN;

CREATE TABLE IF NOT EXISTS revenue_operator.opportunity_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES revenue_operator.conversations(id) ON DELETE CASCADE,
  last_customer_message_at timestamptz,
  last_business_message_at timestamptz,
  momentum_state text NOT NULL DEFAULT 'active'
    CHECK (momentum_state IN ('active', 'slowing', 'stalled', 'revived', 'lost')),
  revive_attempts int NOT NULL DEFAULT 0,
  next_action_at timestamptz,
  authority_required boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(conversation_id)
);

CREATE INDEX IF NOT EXISTS idx_opportunity_states_workspace_state
  ON revenue_operator.opportunity_states (workspace_id, momentum_state)
  WHERE momentum_state NOT IN ('revived', 'lost');

CREATE INDEX IF NOT EXISTS idx_opportunity_states_authority
  ON revenue_operator.opportunity_states (workspace_id)
  WHERE authority_required = true;

CREATE INDEX IF NOT EXISTS idx_opportunity_states_next_action
  ON revenue_operator.opportunity_states (next_action_at)
  WHERE next_action_at IS NOT NULL AND authority_required = false;

COMMIT;

-- Enum value for revenue_recovery_event (run outside transaction; ADD VALUE cannot run inside block in some PG versions)
ALTER TYPE revenue_operator.event_type ADD VALUE IF NOT EXISTS 'revenue_recovery_event';
