-- Counterparty participation state and operational dependency surface. No UI. No marketing.

BEGIN;

CREATE TABLE IF NOT EXISTS revenue_operator.counterparty_participation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  counterparty_identifier text NOT NULL,
  participation_state text NOT NULL DEFAULT 'external'
    CHECK (participation_state IN ('external', 'interacting', 'reliant', 'participant')),
  first_entry_at timestamptz NULL,
  last_entry_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, counterparty_identifier)
);
CREATE INDEX IF NOT EXISTS idx_counterparty_participation_workspace_state
  ON revenue_operator.counterparty_participation (workspace_id, participation_state);
CREATE INDEX IF NOT EXISTS idx_counterparty_participation_identifier
  ON revenue_operator.counterparty_participation (counterparty_identifier);

CREATE TABLE IF NOT EXISTS revenue_operator.operational_dependency (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  external_ref text NULL,
  dependency_type text NOT NULL CHECK (dependency_type IN (
    'coordination_required',
    'confirmation_required',
    'payment_required',
    'outcome_required'
  )),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_operational_dependency_workspace
  ON revenue_operator.operational_dependency (workspace_id);

-- Extend protocol_events.event_type only if the table exists (e.g. created by shared_entry_protocol).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'revenue_operator' AND table_name = 'protocol_events'
  ) THEN
    EXECUTE 'ALTER TABLE revenue_operator.protocol_events DROP CONSTRAINT IF EXISTS protocol_events_event_type_check';
    EXECUTE 'ALTER TABLE revenue_operator.protocol_events ADD CONSTRAINT protocol_events_event_type_check CHECK (event_type IN (''created'', ''token_issued'', ''acknowledged'', ''rescheduled'', ''disputed'', ''expired'', ''mirrored'', ''network_pressure'', ''environment_required''))';
  END IF;
END $$;

COMMIT;
