-- Decision pressure: imminent operational risk within 24h window.
BEGIN;

CREATE TABLE IF NOT EXISTS revenue_operator.immediate_risk_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN (
    'unconfirmed_commitment', 'unpaid_due', 'expected_response',
    'promised_followup', 'deposit_missing'
  )),
  related_external_ref text,
  detected_at timestamptz NOT NULL DEFAULT now(),
  risk_window_end_at timestamptz NOT NULL,
  resolved boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_immediate_risk_events_workspace_resolved
  ON revenue_operator.immediate_risk_events (workspace_id, resolved);
CREATE INDEX IF NOT EXISTS idx_immediate_risk_events_risk_window
  ON revenue_operator.immediate_risk_events (risk_window_end_at) WHERE resolved = false;

-- Track which risk categories existed during observing (for continuation_prevented).
CREATE TABLE IF NOT EXISTS revenue_operator.immediate_risk_categories_during_observing (
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  category text NOT NULL,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, category)
);

-- One-time propagation message sent per workspace.
CREATE TABLE IF NOT EXISTS revenue_operator.coordination_reliance_message_sent (
  workspace_id uuid PRIMARY KEY REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  sent_at timestamptz NOT NULL DEFAULT now()
);

COMMIT;
