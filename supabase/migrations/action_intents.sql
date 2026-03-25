-- Action intents: universal execution interface. This repo emits intents; external executor performs actions.
-- Append-only truth; no deletes. Deterministic emission only.

BEGIN;

CREATE TABLE IF NOT EXISTS revenue_operator.action_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  thread_id uuid REFERENCES revenue_operator.shared_transactions(id) ON DELETE SET NULL,
  work_unit_id uuid,
  intent_type text NOT NULL,
  payload_json jsonb NOT NULL DEFAULT '{}',
  dedupe_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  claimed_at timestamptz,
  claimed_by text,
  completed_at timestamptz,
  result_status text CHECK (result_status IS NULL OR result_status IN ('succeeded', 'failed', 'skipped')),
  result_ref text
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_action_intents_dedupe_key
  ON revenue_operator.action_intents (dedupe_key);

CREATE INDEX IF NOT EXISTS idx_action_intents_workspace_created
  ON revenue_operator.action_intents (workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_action_intents_unclaimed_created
  ON revenue_operator.action_intents (workspace_id, created_at ASC)
  WHERE claimed_at IS NULL;

COMMENT ON TABLE revenue_operator.action_intents IS 'Emitted by Revenue Operator; claimed and completed by external executor. No external API calls in this repo.';

COMMIT;
