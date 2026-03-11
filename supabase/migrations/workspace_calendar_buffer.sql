-- Workspace calendar buffer between appointments (Task 20).
-- Used in availability to enforce gap between slots.

ALTER TABLE revenue_operator.workspaces
  ADD COLUMN IF NOT EXISTS calendar_buffer_minutes int NOT NULL DEFAULT 15
  CHECK (calendar_buffer_minutes >= 0 AND calendar_buffer_minutes <= 120);

COMMENT ON COLUMN revenue_operator.workspaces.calendar_buffer_minutes IS 'Minutes between appointments for availability; 0–120, default 15';
