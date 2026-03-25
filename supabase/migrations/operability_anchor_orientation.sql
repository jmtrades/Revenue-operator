-- Track first-time operation anchored orientation (once per workspace).

ALTER TABLE revenue_operator.workspace_orientation_state
  ADD COLUMN IF NOT EXISTS operation_anchored_orientation_recorded_at timestamptz;
