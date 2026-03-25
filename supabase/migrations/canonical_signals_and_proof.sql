-- Five-layer doctrine: Signal Layer + Proof Layer
-- 1. canonical_signals: append-only business events (idempotency_key = no double process)
-- 2. revenue_proof: value attribution (dashboard reads only from here)

BEGIN;

-- Canonical signal types (ground truth). Connectors produce only these.
CREATE TABLE IF NOT EXISTS revenue_operator.canonical_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES revenue_operator.leads(id) ON DELETE CASCADE,
  signal_type text NOT NULL
    CHECK (signal_type IN (
      'InboundMessageReceived','OutboundMessageSent','BookingCreated','BookingCancelled',
      'AppointmentStarted','AppointmentCompleted','AppointmentMissed','PaymentCaptured',
      'CustomerReplied','CustomerInactiveTimeout'
    )),
  idempotency_key text NOT NULL UNIQUE,
  payload jsonb NOT NULL DEFAULT '{}',
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_canonical_signals_workspace_lead_occurred
  ON revenue_operator.canonical_signals (workspace_id, lead_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_canonical_signals_idempotency
  ON revenue_operator.canonical_signals (idempotency_key);

-- Proof records: every revenue outcome with causality. Dashboard aggregates only from here.
CREATE TABLE IF NOT EXISTS revenue_operator.revenue_proof (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES revenue_operator.leads(id) ON DELETE CASCADE,
  proof_type text NOT NULL
    CHECK (proof_type IN (
      'RecoveredNoShow','NewBooking','SavedConversation','ReactivatedCustomer','RepeatVisit'
    )),
  operator_id text,
  signal_id uuid REFERENCES revenue_operator.canonical_signals(id) ON DELETE SET NULL,
  state_before text,
  state_after text,
  payload jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_revenue_proof_workspace_type_created
  ON revenue_operator.revenue_proof (workspace_id, proof_type, created_at);
CREATE INDEX IF NOT EXISTS idx_revenue_proof_lead
  ON revenue_operator.revenue_proof (lead_id, created_at);

COMMIT;
