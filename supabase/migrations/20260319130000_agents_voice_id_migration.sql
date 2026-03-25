-- Add voice_id column to agents table and backfill from legacy elevenlabs_voice_id when present.
-- Idempotent and safe if elevenlabs_voice_id column does not exist yet.
BEGIN;

ALTER TABLE revenue_operator.agents
  ADD COLUMN IF NOT EXISTS voice_id TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'revenue_operator'
      AND table_name = 'agents'
      AND column_name = 'elevenlabs_voice_id'
  ) THEN
    UPDATE revenue_operator.agents
    SET voice_id = elevenlabs_voice_id
    WHERE (voice_id IS NULL OR voice_id = '')
      AND elevenlabs_voice_id IS NOT NULL
      AND elevenlabs_voice_id <> '';
  END IF;
END $$;

COMMIT;

