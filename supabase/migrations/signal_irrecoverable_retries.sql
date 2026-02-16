-- Prevent starvation: track process_signal retries and allow marking earliest blocking signal irrecoverable.
-- After MAX_SIGNAL_RETRIES failures: escalate, set processed_at + failure_reason, so later signals may run.

ALTER TABLE revenue_operator.canonical_signals
  ADD COLUMN IF NOT EXISTS signal_processing_attempts integer NOT NULL DEFAULT 0;

ALTER TABLE revenue_operator.canonical_signals
  ADD COLUMN IF NOT EXISTS failure_reason text;
