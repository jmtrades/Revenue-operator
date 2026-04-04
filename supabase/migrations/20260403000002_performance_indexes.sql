-- Performance indexes for 1000+ user scale.
-- All use IF NOT EXISTS for idempotent re-runs.

-- Leads: workspace_id + state (most common dashboard query)
CREATE INDEX IF NOT EXISTS idx_leads_workspace_state
  ON revenue_operator.leads(workspace_id, state);

-- Leads: workspace_id + created_at (lead list sorted by date)
CREATE INDEX IF NOT EXISTS idx_leads_workspace_created
  ON revenue_operator.leads(workspace_id, created_at DESC);

-- Call sessions: workspace_id + call_started_at (call history, analytics)
CREATE INDEX IF NOT EXISTS idx_call_sessions_workspace_started
  ON revenue_operator.call_sessions(workspace_id, call_started_at DESC);

-- Notifications: user_id + read status (notification center)
CREATE INDEX IF NOT EXISTS idx_notifications_user_read
  ON revenue_operator.notifications(user_id, read, created_at DESC);

-- Workspace members: user_id (find workspaces for a user)
CREATE INDEX IF NOT EXISTS idx_workspace_members_user
  ON revenue_operator.workspace_members(user_id);

-- Email send queue: workspace_id + status (email delivery tracking)
CREATE INDEX IF NOT EXISTS idx_email_queue_workspace_status
  ON revenue_operator.email_send_queue(workspace_id, status);

-- Daily metrics: workspace_id + date (dashboard chart queries)
CREATE INDEX IF NOT EXISTS idx_daily_metrics_workspace_date
  ON revenue_operator.daily_metrics(workspace_id, date DESC);

-- Follow-up sequences: workspace_id (sequence list)
CREATE INDEX IF NOT EXISTS idx_follow_up_sequences_workspace
  ON revenue_operator.follow_up_sequences(workspace_id);

-- Agents: workspace_id (agent list)
CREATE INDEX IF NOT EXISTS idx_agents_workspace
  ON revenue_operator.agents(workspace_id);

-- Webhook deliveries: workspace_id + status (dead-letter monitoring)
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_workspace_status
  ON revenue_operator.webhook_deliveries(workspace_id, status);
