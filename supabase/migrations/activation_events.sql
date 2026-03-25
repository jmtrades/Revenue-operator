-- Activation events tracking table
-- Tracks user activation steps for optimization

CREATE TABLE IF NOT EXISTS revenue_operator.activation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  user_id uuid REFERENCES revenue_operator.users(id) ON DELETE SET NULL,
  step text NOT NULL CHECK (step IN ('signup', 'connected_number', 'inbound_received', 'reply_sent', 'dashboard_viewed_next_day')),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activation_events_workspace_id ON revenue_operator.activation_events(workspace_id);
CREATE INDEX IF NOT EXISTS idx_activation_events_step ON revenue_operator.activation_events(step);
CREATE INDEX IF NOT EXISTS idx_activation_events_created_at ON revenue_operator.activation_events(created_at);

-- Add first_day_email_sent_at to workspaces for tracking
ALTER TABLE revenue_operator.workspaces
  ADD COLUMN IF NOT EXISTS first_day_email_sent_at timestamptz;
