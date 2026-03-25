-- Counterparty reliance: operational dependence classification (observed | recurring | dependent | critical).

BEGIN;

CREATE TABLE IF NOT EXISTS revenue_operator.counterparty_reliance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  counterparty_identifier text NOT NULL,
  interaction_count int NOT NULL DEFAULT 0,
  shared_entries_count int NOT NULL DEFAULT 0,
  acknowledged_count int NOT NULL DEFAULT 0,
  last_interaction_at timestamptz NOT NULL DEFAULT now(),
  reliance_state text NOT NULL DEFAULT 'observed'
    CHECK (reliance_state IN ('observed', 'recurring', 'dependent', 'critical')),
  invite_issued_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, counterparty_identifier)
);
CREATE INDEX IF NOT EXISTS idx_counterparty_reliance_workspace_state
  ON revenue_operator.counterparty_reliance (workspace_id, reliance_state);
CREATE INDEX IF NOT EXISTS idx_counterparty_reliance_invite_eligible
  ON revenue_operator.counterparty_reliance (workspace_id, reliance_state)
  WHERE invite_issued_at IS NULL AND reliance_state IN ('dependent', 'critical');

-- Allow network_pressure in protocol_events
ALTER TABLE revenue_operator.protocol_events
  DROP CONSTRAINT IF EXISTS protocol_events_event_type_check;
ALTER TABLE revenue_operator.protocol_events
  ADD CONSTRAINT protocol_events_event_type_check
  CHECK (event_type IN ('created', 'token_issued', 'acknowledged', 'rescheduled', 'disputed', 'expired', 'mirrored', 'network_pressure'));

-- Link incoming_entries to origin workspace for network_entries (reliance_state = critical)
ALTER TABLE revenue_operator.incoming_entries
  ADD COLUMN IF NOT EXISTS origin_workspace_id uuid REFERENCES revenue_operator.workspaces(id) ON DELETE SET NULL;

COMMIT;
