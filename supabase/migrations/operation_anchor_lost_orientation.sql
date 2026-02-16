-- Track anchor loss orientation (once per workspace, silent).

ALTER TABLE revenue_operator.workspace_orientation_state
  ADD COLUMN IF NOT EXISTS operation_anchor_lost_orientation_recorded_at timestamptz;
