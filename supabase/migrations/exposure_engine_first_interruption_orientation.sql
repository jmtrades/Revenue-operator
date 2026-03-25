-- First interruption orientation: record once per workspace when an exposure is first marked interrupted.

ALTER TABLE revenue_operator.workspace_orientation_state
  ADD COLUMN IF NOT EXISTS first_interruption_orientation_recorded_at timestamptz;
