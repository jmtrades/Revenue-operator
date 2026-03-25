-- Commitment Recovery Engine: commitments + commitment_events
-- Every commitment reaches a terminal outcome (completed, rescheduled, cancelled, failed, reassigned).

BEGIN;

CREATE TABLE IF NOT EXISTS revenue_operator.commitments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  subject_type text NOT NULL CHECK (subject_type IN ('lead', 'conversation', 'invoice', 'booking', 'task')),
  subject_id uuid NOT NULL,
  expected_at timestamptz NOT NULL,
  state text NOT NULL DEFAULT 'pending'
    CHECK (state IN ('pending', 'awaiting_response', 'awaiting_confirmation', 'overdue', 'recovery_required', 'resolved')),
  terminal_outcome text CHECK (terminal_outcome IS NULL OR terminal_outcome IN ('completed', 'rescheduled', 'cancelled', 'failed', 'reassigned')),
  authority_required boolean NOT NULL DEFAULT false,
  recovery_attempts int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_commitments_workspace_state_expected
  ON revenue_operator.commitments (workspace_id, state, expected_at)
  WHERE state != 'resolved';

CREATE INDEX IF NOT EXISTS idx_commitments_authority_required
  ON revenue_operator.commitments (workspace_id)
  WHERE authority_required = true;

CREATE INDEX IF NOT EXISTS idx_commitments_subject
  ON revenue_operator.commitments (subject_type, subject_id);

CREATE TABLE IF NOT EXISTS revenue_operator.commitment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commitment_id uuid NOT NULL REFERENCES revenue_operator.commitments(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('created', 'reminder_sent', 'escalated', 'auto_resolved', 'user_resolved', 'recovery_attempt')),
  payload jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_commitment_events_commitment_id
  ON revenue_operator.commitment_events (commitment_id);

COMMIT;
