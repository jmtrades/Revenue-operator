-- Error reports from client (error boundary + unhandled rejections). No PII.
CREATE TABLE IF NOT EXISTS revenue_operator.error_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES revenue_operator.workspaces(id) ON DELETE SET NULL,
  user_id uuid,
  error_message text NOT NULL,
  stack_trace text,
  error_type text,
  page_url text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_error_reports_workspace_created
  ON revenue_operator.error_reports (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_reports_error_type
  ON revenue_operator.error_reports (error_type) WHERE error_type IS NOT NULL;

ALTER TABLE revenue_operator.error_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "error_reports_insert_authenticated"
  ON revenue_operator.error_reports FOR INSERT
  WITH CHECK (true);

CREATE POLICY "error_reports_select_own_workspace"
  ON revenue_operator.error_reports FOR SELECT
  USING (
    workspace_id IS NULL
    OR workspace_id IN (SELECT id FROM revenue_operator.workspaces WHERE owner_id = auth.uid())
    OR workspace_id IN (SELECT workspace_id FROM revenue_operator.workspace_members WHERE user_id = auth.uid())
  );

COMMENT ON TABLE revenue_operator.error_reports IS 'Client error reports from error boundary and unhandled rejections. No PII.';
