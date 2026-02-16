-- Orientation layer: end-of-outcome records and first-check / absence / removal-shock state.
-- No UI. Chronological truth feed only.

CREATE TABLE IF NOT EXISTS revenue_operator.orientation_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orientation_records_workspace_created
  ON revenue_operator.orientation_records(workspace_id, created_at DESC);

CREATE TABLE IF NOT EXISTS revenue_operator.workspace_orientation_state (
  workspace_id uuid PRIMARY KEY REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  last_orientation_viewed_at timestamptz,
  orientation_checked_at timestamptz,
  orientation_absence_sent_at date,
  orientation_pending_sent_at date
);
