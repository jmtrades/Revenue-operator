-- Operational Closure Layer: responsibility history and dormant marker.
-- No UI, no config, no analytics; operational finality only.

BEGIN;

-- 1. lead_responsibility_history: one row per responsibility transition
CREATE TABLE IF NOT EXISTS revenue_operator.lead_responsibility_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES revenue_operator.leads(id) ON DELETE CASCADE,
  previous_state text,
  new_state text NOT NULL,
  resolved_at timestamptz NOT NULL DEFAULT now(),
  reason text NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_lead_responsibility_history_lead_resolved
  ON revenue_operator.lead_responsibility_history (lead_id, resolved_at DESC);

-- 2. closure_dormant_at: mark leads that have been completed past lifecycle return window
ALTER TABLE revenue_operator.leads
  ADD COLUMN IF NOT EXISTS closure_dormant_at timestamptz;

-- 3. Allow ResponsibilityResolved in revenue_proof (if table exists in this schema)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'revenue_operator' AND table_name = 'revenue_proof') THEN
    ALTER TABLE revenue_operator.revenue_proof DROP CONSTRAINT IF EXISTS revenue_proof_proof_type_check;
    ALTER TABLE revenue_operator.revenue_proof
      ADD CONSTRAINT revenue_proof_proof_type_check CHECK (proof_type IN (
        'LeadReceived','RecoveredNoShow','NewBooking','SavedConversation','ReactivatedCustomer','RepeatVisit','ResponsibilityResolved'
      ));
  END IF;
END $$;

COMMIT;
