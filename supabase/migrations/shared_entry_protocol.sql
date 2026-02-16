-- Shared Entry Protocol: external_ref, protocol_events, counterparty_identities, incoming_entries.

BEGIN;

-- A1) external_ref on shared_transactions (public, stable, no internal ids)
ALTER TABLE revenue_operator.shared_transactions
  ADD COLUMN IF NOT EXISTS external_ref text;
UPDATE revenue_operator.shared_transactions
  SET external_ref = gen_random_uuid()::text
  WHERE external_ref IS NULL;
ALTER TABLE revenue_operator.shared_transactions
  ALTER COLUMN external_ref SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_shared_transactions_external_ref
  ON revenue_operator.shared_transactions (external_ref);

-- A2) protocol_events append-only
CREATE TABLE IF NOT EXISTS revenue_operator.protocol_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_ref text NOT NULL,
  workspace_id uuid REFERENCES revenue_operator.workspaces(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (event_type IN ('created', 'token_issued', 'acknowledged', 'rescheduled', 'disputed', 'expired', 'mirrored')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_protocol_events_external_ref_created
  ON revenue_operator.protocol_events (external_ref, created_at);
CREATE INDEX IF NOT EXISTS idx_protocol_events_event_type_created
  ON revenue_operator.protocol_events (event_type, created_at);

-- B1) counterparty_identities (identifier -> workspace)
CREATE TABLE IF NOT EXISTS revenue_operator.counterparty_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  identifier text NOT NULL,
  identifier_type text NOT NULL CHECK (identifier_type IN ('email', 'phone', 'other')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(identifier_type, identifier)
);
CREATE INDEX IF NOT EXISTS idx_counterparty_identities_identifier
  ON revenue_operator.counterparty_identities (identifier_type, identifier);

-- C3) incoming_entries (shadow entry surface for counterparty workspace)
CREATE TABLE IF NOT EXISTS revenue_operator.incoming_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  external_ref text NOT NULL,
  state text NOT NULL DEFAULT 'normal'
    CHECK (state IN ('normal', 'outside_authority', 'beyond_scope', 'exposure')),
  last_event_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, external_ref)
);
CREATE INDEX IF NOT EXISTS idx_incoming_entries_workspace_state
  ON revenue_operator.incoming_entries (workspace_id, state)
  WHERE state != 'normal';

COMMIT;
