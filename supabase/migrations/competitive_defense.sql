-- Layer 8: Competitive defense. Consent ledger, disclosure ack, opt-out enforcement, breach signals.

BEGIN;

-- Recorded consent ledger (append-only)
CREATE TABLE IF NOT EXISTS revenue_operator.consent_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES revenue_operator.leads(id) ON DELETE SET NULL,
  consent_type text NOT NULL,
  channel text,
  scope text,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  source_ref text
);

CREATE INDEX IF NOT EXISTS idx_consent_ledger_workspace
  ON revenue_operator.consent_ledger (workspace_id);
CREATE INDEX IF NOT EXISTS idx_consent_ledger_lead
  ON revenue_operator.consent_ledger (lead_id) WHERE lead_id IS NOT NULL;

-- Compliance breach detection signals (internal; no PII in message)
CREATE TABLE IF NOT EXISTS revenue_operator.compliance_breach_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  signal_type text NOT NULL,
  work_unit_id uuid,
  thread_id uuid,
  jurisdiction_misalignment boolean DEFAULT false,
  unauthorized_authority boolean DEFAULT false,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_compliance_breach_signals_workspace
  ON revenue_operator.compliance_breach_signals (workspace_id);

COMMENT ON TABLE revenue_operator.consent_ledger IS 'Recorded consent. Append-only. Used for opt-out and disclosure enforcement.';
COMMENT ON TABLE revenue_operator.compliance_breach_signals IS 'Internal breach signals. Jurisdiction/authority detection. No PII.';

COMMIT;
