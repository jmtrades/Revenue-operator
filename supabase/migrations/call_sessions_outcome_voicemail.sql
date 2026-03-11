-- call_sessions: outcome for tracking voicemail, completed, no_answer, etc.
-- Used by Vapi webhook end-of-call-report (endedReason) and voice outcome API.

ALTER TABLE revenue_operator.call_sessions
  ADD COLUMN IF NOT EXISTS outcome text
  CHECK (outcome IS NULL OR outcome IN ('completed', 'voicemail', 'no_answer', 'busy', 'failed', 'canceled'));

COMMENT ON COLUMN revenue_operator.call_sessions.outcome IS 'Call end reason: completed, voicemail, no_answer, busy, failed, canceled. Set from Vapi endedReason or voice outcome API.';
