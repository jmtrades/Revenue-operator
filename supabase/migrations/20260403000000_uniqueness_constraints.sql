-- Uniqueness constraints to prevent data duplication at the DB level.
-- All use IF NOT EXISTS for idempotent re-runs.

-- One workspace per owner (prevents race-condition duplicate workspaces during signup)
CREATE UNIQUE INDEX IF NOT EXISTS idx_workspaces_owner_id
  ON revenue_operator.workspaces(owner_id);

-- One call session per external meeting (prevents Twilio retry duplicates)
CREATE UNIQUE INDEX IF NOT EXISTS idx_call_sessions_external_meeting_id
  ON revenue_operator.call_sessions(external_meeting_id)
  WHERE external_meeting_id IS NOT NULL;

-- One enrollment per contact per sequence (prevents double-enrollment)
CREATE UNIQUE INDEX IF NOT EXISTS idx_sequence_enrollments_unique
  ON revenue_operator.sequence_enrollments(sequence_id, contact_id);
