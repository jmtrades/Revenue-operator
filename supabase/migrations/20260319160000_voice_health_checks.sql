-- Voice server health checks (system-wide, best-effort monitoring)
BEGIN;

CREATE TABLE IF NOT EXISTS revenue_operator.voice_health_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checked_at timestamptz DEFAULT now(),
  voice_server_url text,
  ok boolean NOT NULL DEFAULT false,
  latency_ms integer,
  active_conversations integer,
  max_concurrent integer,
  alert_reason text,
  error_message text
);

CREATE INDEX IF NOT EXISTS idx_voice_health_checks_checked_at
  ON revenue_operator.voice_health_checks (checked_at DESC);

COMMIT;

