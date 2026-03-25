-- Continuity Environment extension: timeline memory, memory replacement, external recognition.

BEGIN;

-- Passage of time: consecutive operational days when orientation produced.
CREATE TABLE IF NOT EXISTS revenue_operator.operational_timeline_memory (
  workspace_id uuid PRIMARY KEY REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  last_seen_operational_day date NOT NULL,
  consecutive_operational_days integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Memory substitution: system did the remembering (followup, payment, outcome, conversation).
CREATE TABLE IF NOT EXISTS revenue_operator.memory_replacement_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN (
    'followup',
    'payment_recovered',
    'outcome_confirmed',
    'conversation_revived'
  )),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_memory_replacement_events_workspace
  ON revenue_operator.memory_replacement_events(workspace_id);
CREATE INDEX IF NOT EXISTS idx_memory_replacement_events_created
  ON revenue_operator.memory_replacement_events(workspace_id, created_at DESC);

-- Cross-party recognition: two different counterparties acknowledged in window.
CREATE TABLE IF NOT EXISTS revenue_operator.environment_recognition (
  workspace_id uuid PRIMARY KEY REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  recognized boolean NOT NULL DEFAULT false,
  last_updated_at timestamptz NOT NULL DEFAULT now()
);

-- One-time orientation when operationally_embedded becomes true.
ALTER TABLE revenue_operator.workspace_orientation_state
  ADD COLUMN IF NOT EXISTS operational_process_established_at timestamptz;

COMMIT;
