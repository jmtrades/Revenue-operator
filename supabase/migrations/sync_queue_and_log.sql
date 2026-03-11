-- Sync queue and sync log for bidirectional CRM sync (Task 19).
-- sync_queue: pending/retry jobs; sync_log: audit trail of sync events.

CREATE TABLE IF NOT EXISTS revenue_operator.sync_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  provider text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  entity_type text NOT NULL DEFAULT 'lead' CHECK (entity_type IN ('lead', 'contact')),
  entity_id uuid,
  payload jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  retry_count int NOT NULL DEFAULT 0,
  max_retries int NOT NULL DEFAULT 5,
  next_retry_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_sync_queue_workspace_status
  ON revenue_operator.sync_queue(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_sync_queue_next_retry
  ON revenue_operator.sync_queue(next_retry_at) WHERE status = 'pending' AND next_retry_at IS NOT NULL;

ALTER TABLE revenue_operator.sync_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_sync_queue"
  ON revenue_operator.sync_queue FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM revenue_operator.workspaces w
      WHERE w.id = sync_queue.workspace_id
      AND (w.owner_id = auth.uid() OR EXISTS (
        SELECT 1 FROM revenue_operator.workspace_members wm
        WHERE wm.workspace_id = w.id AND wm.user_id = auth.uid()
      ))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM revenue_operator.workspaces w
      WHERE w.id = sync_queue.workspace_id
      AND (w.owner_id = auth.uid() OR EXISTS (
        SELECT 1 FROM revenue_operator.workspace_members wm
        WHERE wm.workspace_id = w.id AND wm.user_id = auth.uid()
      ))
    )
  );

-- Sync log: audit trail (append-only view for UI).
CREATE TABLE IF NOT EXISTS revenue_operator.sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  provider text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  entity_type text NOT NULL DEFAULT 'lead',
  entity_id uuid,
  action text NOT NULL CHECK (action IN ('created', 'updated', 'failed', 'conflict', 'skipped')),
  summary text,
  payload_snapshot jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sync_log_workspace_created
  ON revenue_operator.sync_log(workspace_id, created_at DESC);

ALTER TABLE revenue_operator.sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_sync_log"
  ON revenue_operator.sync_log FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM revenue_operator.workspaces w
      WHERE w.id = sync_log.workspace_id
      AND (w.owner_id = auth.uid() OR EXISTS (
        SELECT 1 FROM revenue_operator.workspace_members wm
        WHERE wm.workspace_id = w.id AND wm.user_id = auth.uid()
      ))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM revenue_operator.workspaces w
      WHERE w.id = sync_log.workspace_id
      AND (w.owner_id = auth.uid() OR EXISTS (
        SELECT 1 FROM revenue_operator.workspace_members wm
        WHERE wm.workspace_id = w.id AND wm.user_id = auth.uid()
      ))
    )
  );

COMMENT ON TABLE revenue_operator.sync_queue IS 'CRM sync jobs with retry (exponential backoff, max 5 retries)';
COMMENT ON TABLE revenue_operator.sync_log IS 'Audit log of sync events for Sync Log UI';
