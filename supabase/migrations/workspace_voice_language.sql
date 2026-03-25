-- Workspace: voice and language for real, multilingual agent
BEGIN;

ALTER TABLE revenue_operator.workspaces
  ADD COLUMN IF NOT EXISTS preferred_language text DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS elevenlabs_voice_id text;

COMMENT ON COLUMN revenue_operator.workspaces.preferred_language IS 'Preferred response language (e.g. en, es, fr). Agent switches when caller uses another language.';
COMMENT ON COLUMN revenue_operator.workspaces.elevenlabs_voice_id IS 'ElevenLabs voice_id for TTS previews and consistent voice.';

COMMIT;
