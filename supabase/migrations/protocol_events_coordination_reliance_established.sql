-- Allow coordination_reliance_established for propagation ignition.
ALTER TABLE revenue_operator.protocol_events
  DROP CONSTRAINT IF EXISTS protocol_events_event_type_check;
ALTER TABLE revenue_operator.protocol_events
  ADD CONSTRAINT protocol_events_event_type_check
  CHECK (event_type IN (
    'created', 'token_issued', 'acknowledged', 'rescheduled', 'disputed', 'expired',
    'mirrored', 'network_pressure', 'environment_required',
    'settlement_issued', 'settlement_opened', 'settlement_authorized', 'settlement_expired',
    'settlement_exported', 'settlement_export_failed',
    'outbound_throttled',
    'coordination_reliance_established'
  ));
