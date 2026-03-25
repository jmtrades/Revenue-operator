-- Workspace recording consent for Task 16: one-party, two-party, or none.
-- Two-party: play announcement at call start; consent stored per workspace.

ALTER TABLE revenue_operator.workspaces
  ADD COLUMN IF NOT EXISTS recording_consent_mode text NOT NULL DEFAULT 'one_party'
  CHECK (recording_consent_mode IN ('one_party', 'two_party', 'none'));

ALTER TABLE revenue_operator.workspaces
  ADD COLUMN IF NOT EXISTS recording_consent_announcement text;

ALTER TABLE revenue_operator.workspaces
  ADD COLUMN IF NOT EXISTS recording_pause_on_sensitive boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN revenue_operator.workspaces.recording_consent_mode IS 'one_party: single-party consent; two_party: play announcement at call start; none: do not record';
COMMENT ON COLUMN revenue_operator.workspaces.recording_consent_announcement IS 'Custom two-party consent script; null = use default';
COMMENT ON COLUMN revenue_operator.workspaces.recording_pause_on_sensitive IS 'When true, prefer pausing recording during sensitive info (best-effort)';
