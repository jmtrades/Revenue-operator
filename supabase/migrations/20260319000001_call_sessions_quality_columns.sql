BEGIN;

-- Store per-call quality metrics directly on call_sessions for analytics + monitoring.
ALTER TABLE revenue_operator.call_sessions
  ADD COLUMN IF NOT EXISTS answer_latency_ms integer,
  ADD COLUMN IF NOT EXISTS avg_response_latency_ms integer,
  ADD COLUMN IF NOT EXISTS interruption_count integer,
  ADD COLUMN IF NOT EXISTS fallback_events jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS cost_cents integer,
  ADD COLUMN IF NOT EXISTS stt_model text,
  ADD COLUMN IF NOT EXISTS tts_model text,
  ADD COLUMN IF NOT EXISTS llm_model text;

COMMIT;

