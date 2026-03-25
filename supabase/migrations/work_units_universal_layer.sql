-- Work Units: universal abstraction above all verticals.
-- Request, commitment, negotiation, compliance, scheduled action, settlement, document exchange, review.
-- Existing shared_transactions become Work Units of type shared_transaction. No breaking changes.

BEGIN;

CREATE TABLE IF NOT EXISTS revenue_operator.work_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  type text NOT NULL,
  subject_type text NOT NULL,
  subject_id text NOT NULL,
  state text NOT NULL DEFAULT 'pending',
  completion_required_confirmation boolean NOT NULL DEFAULT true,
  completion_required_evidence boolean NOT NULL DEFAULT false,
  completion_required_payment boolean NOT NULL DEFAULT false,
  completion_required_third_party boolean NOT NULL DEFAULT false,
  completion_allows_internal_close boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_work_units_workspace_state
  ON revenue_operator.work_units (workspace_id, state);
CREATE INDEX IF NOT EXISTS idx_work_units_subject
  ON revenue_operator.work_units (subject_type, subject_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_work_units_subject_uniq
  ON revenue_operator.work_units (workspace_id, subject_type, subject_id);

COMMENT ON TABLE revenue_operator.work_units IS 'Universal work abstraction: request, commitment, negotiation, compliance, action, settlement. Deterministic state machines only.';

-- Backfill: one work_unit per existing shared_transaction (type shared_transaction, subject_id = id)
INSERT INTO revenue_operator.work_units (
  workspace_id,
  type,
  subject_type,
  subject_id,
  state,
  completion_required_confirmation,
  completion_required_evidence,
  completion_required_payment,
  completion_required_third_party,
  completion_allows_internal_close,
  created_at,
  updated_at
)
SELECT
  st.workspace_id,
  'shared_transaction',
  'shared_transaction',
  st.id::text,
  CASE st.state
    WHEN 'pending_acknowledgement' THEN 'pending'
    WHEN 'acknowledged' THEN 'acknowledged'
    WHEN 'disputed' THEN 'disputed'
    WHEN 'expired' THEN 'expired'
    ELSE 'pending'
  END,
  COALESCE(st.acknowledgement_required, true),
  false,
  false,
  false,
  false,
  st.created_at,
  st.updated_at
FROM revenue_operator.shared_transactions st
ON CONFLICT (workspace_id, subject_type, subject_id) DO NOTHING;

-- Trigger: new shared_transactions get a work_unit (for future inserts)
CREATE OR REPLACE FUNCTION revenue_operator.work_unit_from_shared_transaction()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO revenue_operator.work_units (
    workspace_id, type, subject_type, subject_id, state,
    completion_required_confirmation, created_at, updated_at
  ) VALUES (
    NEW.workspace_id, 'shared_transaction', 'shared_transaction', NEW.id::text,
    CASE NEW.state WHEN 'pending_acknowledgement' THEN 'pending' WHEN 'acknowledged' THEN 'acknowledged' WHEN 'disputed' THEN 'disputed' WHEN 'expired' THEN 'expired' ELSE 'pending' END,
    COALESCE(NEW.acknowledgement_required, true), now(), now()
  )
  ON CONFLICT (workspace_id, subject_type, subject_id) DO UPDATE SET
    state = EXCLUDED.state,
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_work_unit_from_shared_transaction ON revenue_operator.shared_transactions;
CREATE TRIGGER tr_work_unit_from_shared_transaction
  AFTER INSERT OR UPDATE OF state ON revenue_operator.shared_transactions
  FOR EACH ROW EXECUTE FUNCTION revenue_operator.work_unit_from_shared_transaction();

COMMIT;
