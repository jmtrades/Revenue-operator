BEGIN;

ALTER TABLE revenue_operator.workspaces
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deletion_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS deletion_effective_at timestamptz,
  ADD COLUMN IF NOT EXISTS deletion_status text,
  ADD COLUMN IF NOT EXISTS anonymized_analytics_retained boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_workspaces_deletion_effective_at
  ON revenue_operator.workspaces(deletion_effective_at)
  WHERE deletion_effective_at IS NOT NULL;

COMMIT;
