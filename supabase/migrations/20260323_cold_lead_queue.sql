-- Cold lead queue: tracks leads marked as cold with re-engagement scheduling.
-- Used by /api/cold-leads and /app/cold-leads page.

CREATE TABLE IF NOT EXISTS revenue_operator.cold_lead_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES revenue_operator.leads(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'attempted', 'converted', 'exhausted', 'cancelled')),
  reason TEXT,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  strategy TEXT,
  next_attempt_at TIMESTAMPTZ,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_attempted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(lead_id, workspace_id)
);

CREATE INDEX IF NOT EXISTS idx_cold_lead_queue_workspace ON revenue_operator.cold_lead_queue(workspace_id);
CREATE INDEX IF NOT EXISTS idx_cold_lead_queue_status ON revenue_operator.cold_lead_queue(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_cold_lead_queue_next_attempt ON revenue_operator.cold_lead_queue(workspace_id, next_attempt_at) WHERE status IN ('pending', 'scheduled');

ALTER TABLE revenue_operator.cold_lead_queue ENABLE ROW LEVEL SECURITY;

-- RLS: workspace members can read/write their own queue items
CREATE POLICY cold_lead_queue_workspace_read ON revenue_operator.cold_lead_queue
  FOR SELECT USING (workspace_id IN (
    SELECT id FROM revenue_operator.workspaces WHERE id = workspace_id
  ));

CREATE POLICY cold_lead_queue_workspace_write ON revenue_operator.cold_lead_queue
  FOR ALL USING (workspace_id IN (
    SELECT id FROM revenue_operator.workspaces WHERE id = workspace_id
  ));

COMMENT ON TABLE revenue_operator.cold_lead_queue IS 'Cold lead re-engagement queue with priority scheduling';
