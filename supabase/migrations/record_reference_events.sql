CREATE TABLE IF NOT EXISTS revenue_operator.record_reference_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  actor_type text NOT NULL CHECK (actor_type IN ('staff', 'customer', 'counterparty')),
  reference_type text NOT NULL CHECK (reference_type IN ('public_record', 'dashboard_record', 'ack_flow')),
  external_ref text,
  recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_record_reference_workspace_recorded ON revenue_operator.record_reference_events(workspace_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_record_reference_workspace_ref ON revenue_operator.record_reference_events(workspace_id, external_ref);
