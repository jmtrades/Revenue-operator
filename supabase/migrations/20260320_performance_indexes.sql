-- Performance indexes for production query patterns
CREATE INDEX IF NOT EXISTS idx_calls_workspace_created
  ON revenue_operator.calls (workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_contacts_workspace_phone
  ON revenue_operator.contacts (workspace_id, phone);

CREATE INDEX IF NOT EXISTS idx_contacts_workspace_email
  ON revenue_operator.contacts (workspace_id, email);

CREATE INDEX IF NOT EXISTS idx_outbound_messages_external_id
  ON revenue_operator.outbound_messages (external_id);

CREATE INDEX IF NOT EXISTS idx_call_sessions_external_meeting_id
  ON revenue_operator.call_sessions (external_meeting_id);

CREATE INDEX IF NOT EXISTS idx_agents_workspace_id
  ON revenue_operator.agents (workspace_id);

CREATE INDEX IF NOT EXISTS idx_contacts_workspace_status_created
  ON revenue_operator.contacts (workspace_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_contacts_next_followup
  ON revenue_operator.contacts (next_followup_at)
  WHERE next_followup_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_workspaces_owner_id
  ON revenue_operator.workspaces (owner_id);

CREATE INDEX IF NOT EXISTS idx_calls_lead_id
  ON revenue_operator.calls (lead_id);
