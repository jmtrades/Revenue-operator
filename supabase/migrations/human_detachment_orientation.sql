-- Track first-time provider detachment orientation (append once).

ALTER TABLE revenue_operator.workspace_orientation_state
  ADD COLUMN IF NOT EXISTS provider_detached_orientation_recorded_at timestamptz;
