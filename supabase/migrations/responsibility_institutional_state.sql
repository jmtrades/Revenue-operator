-- Extend institutional_state to include terminal state 'institutional'.
-- Drop existing check and re-add with 'institutional'.

ALTER TABLE revenue_operator.workspace_orientation_state
  DROP CONSTRAINT IF EXISTS workspace_orientation_state_institutional_state_check;

ALTER TABLE revenue_operator.workspace_orientation_state
  ADD CONSTRAINT workspace_orientation_state_institutional_state_check
  CHECK (institutional_state IN ('none', 'embedded', 'reliant', 'assumed', 'institutional'));

ALTER TABLE revenue_operator.workspace_orientation_state
  ADD COLUMN IF NOT EXISTS institutional_orientation_recorded_at timestamptz;
