-- call_sessions: summary (AI post-call) and recording_url for inbound/post-call pipeline
BEGIN;
ALTER TABLE revenue_operator.call_sessions
  ADD COLUMN IF NOT EXISTS summary text,
  ADD COLUMN IF NOT EXISTS recording_url text;
COMMIT;
