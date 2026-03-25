-- Coordination semantics: when humans act (start-of-work, midday, pre-call, workday completion).
-- Part 4 decision clustering: mark handoffs as batch_suppressed when clustered.

BEGIN;

-- Part 1–3, 5 idempotence: one row per workspace per local date per window
CREATE TABLE IF NOT EXISTS revenue_operator.start_of_work_sent (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  sent_local_date text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, sent_local_date)
);

CREATE TABLE IF NOT EXISTS revenue_operator.midday_clarity_sent (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  sent_local_date text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, sent_local_date)
);

CREATE TABLE IF NOT EXISTS revenue_operator.pre_call_prep_sent (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  sent_local_date text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, sent_local_date)
);

CREATE TABLE IF NOT EXISTS revenue_operator.workday_completion_sent (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  sent_local_date text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, sent_local_date)
);

-- Part 4: suppress individual handoff notices when sent as cluster
ALTER TABLE revenue_operator.escalation_logs
  ADD COLUMN IF NOT EXISTS batch_suppressed boolean DEFAULT false;

COMMIT;
