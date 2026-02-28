-- Operational ambiguity expansion: multi-thread contradiction, expiring obligation, silent retraction,
-- unauthorized authority, compliance lapse. All statements factual, ≤90 chars.

BEGIN;

CREATE TABLE IF NOT EXISTS revenue_operator.operational_ambiguity_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  signal_type text NOT NULL CHECK (signal_type IN (
    'multi_thread_contradiction',
    'expiring_obligation',
    'silent_retraction',
    'unauthorized_authority',
    'compliance_lapse',
    'parallel_reality',
    'external_activity',
    'completion_decay'
  )),
  statement text NOT NULL,
  thread_id uuid REFERENCES revenue_operator.shared_transactions(id) ON DELETE SET NULL,
  work_unit_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_operational_ambiguity_signals_workspace_created
  ON revenue_operator.operational_ambiguity_signals (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_operational_ambiguity_signals_type
  ON revenue_operator.operational_ambiguity_signals (workspace_id, signal_type);

COMMENT ON TABLE revenue_operator.operational_ambiguity_signals IS 'Documentary ambiguity signals. Statement max 90 chars. No metrics.';

COMMIT;
