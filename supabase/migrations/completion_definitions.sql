-- Completion definition: per work unit type, what is required for "done".
-- Deterministic. No probabilistic completion.

BEGIN;

CREATE TABLE IF NOT EXISTS revenue_operator.completion_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  work_unit_type text NOT NULL,
  requires_confirmation boolean NOT NULL DEFAULT true,
  requires_evidence boolean NOT NULL DEFAULT false,
  requires_payment boolean NOT NULL DEFAULT false,
  requires_third_party boolean NOT NULL DEFAULT false,
  allows_internal_close boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, work_unit_type)
);

CREATE INDEX IF NOT EXISTS idx_completion_definitions_workspace
  ON revenue_operator.completion_definitions (workspace_id);

COMMENT ON TABLE revenue_operator.completion_definitions IS 'Default completion rules per work unit type. Completion validation is deterministic.';

-- Default for shared_transaction (existing type)
INSERT INTO revenue_operator.completion_definitions (
  workspace_id, work_unit_type, requires_confirmation, requires_evidence, requires_payment, requires_third_party, allows_internal_close
)
SELECT id, 'shared_transaction', true, false, false, false, false
FROM revenue_operator.workspaces
ON CONFLICT (workspace_id, work_unit_type) DO NOTHING;

COMMIT;
