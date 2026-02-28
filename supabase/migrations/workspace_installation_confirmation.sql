-- Workspace installation confirmation: one-time state marking operational recording as active.
-- Triggered when: first acknowledged thread exists, proof capsule exists, absence moment shown.

BEGIN;

ALTER TABLE revenue_operator.workspaces
  ADD COLUMN IF NOT EXISTS installation_confirmed_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_workspaces_installation_confirmed
  ON revenue_operator.workspaces (installation_confirmed_at)
  WHERE installation_confirmed_at IS NOT NULL;

COMMENT ON COLUMN revenue_operator.workspaces.installation_confirmed_at IS 'One-time confirmation: operational recording is active. Set when first acknowledged thread, proof capsule, and absence moment all exist.';

COMMIT;
