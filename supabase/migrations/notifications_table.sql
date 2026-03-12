-- Notification Center: per-user notifications with RLS
CREATE TABLE IF NOT EXISTS revenue_operator.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  metadata jsonb DEFAULT '{}',
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_workspace_created
  ON revenue_operator.notifications (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON revenue_operator.notifications (user_id, read) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON revenue_operator.notifications (user_id, created_at DESC);

ALTER TABLE revenue_operator.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select_own"
  ON revenue_operator.notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "notifications_update_own"
  ON revenue_operator.notifications FOR UPDATE
  USING (user_id = auth.uid());

COMMENT ON TABLE revenue_operator.notifications IS 'In-app notification center: new lead, call completed, appointment booked, campaign milestone, quality alert, billing, system. RLS: users see only their rows.';
