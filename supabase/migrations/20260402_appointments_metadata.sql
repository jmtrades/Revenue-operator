-- Add metadata column to appointments for calendar sync (google_event_id, outlook_event_id).
ALTER TABLE revenue_operator.appointments
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';

-- Index for calendar event lookups during sync
CREATE INDEX IF NOT EXISTS idx_appointments_metadata_gin
  ON revenue_operator.appointments USING gin (metadata);
