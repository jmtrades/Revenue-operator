-- Layer 4: Strategy engine expansion. Lifecycle-complete states (cold_prospect, warm_inbound, appointment_set, etc.).

BEGIN;

ALTER TABLE revenue_operator.conversation_strategy_state
  DROP CONSTRAINT IF EXISTS conversation_strategy_state_current_state_check;

ALTER TABLE revenue_operator.conversation_strategy_state
  ADD CONSTRAINT conversation_strategy_state_current_state_check
  CHECK (current_state IN (
    'discovery', 'pain_identification', 'qualification', 'authority_check', 'timeline_check',
    'financial_alignment', 'objection_handling', 'offer_positioning', 'compliance_disclosure',
    'commitment_request', 'follow_up_lock', 'escalation', 'disqualification',
    'cold_prospect', 'warm_inbound', 'appointment_set', 'no_show', 'recovered',
    'payment_pending', 'contract_sent', 'disclosure_required', 'awaiting_compliance',
    'disputed', 'reactivation'
  ));

COMMENT ON COLUMN revenue_operator.conversation_strategy_state.current_state IS 'Strategy + lifecycle state. Deterministic; no AI invents states.';

COMMIT;
