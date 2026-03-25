-- Voice System Tables Migration
-- Creates comprehensive voice management infrastructure including models, usage tracking,
-- consent records, quality metrics, and A/B testing

-- =====================================================================
-- 1. VOICE_MODELS TABLE
-- =====================================================================
CREATE TABLE voice_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  voice_id text NOT NULL UNIQUE,
  name text NOT NULL,
  gender text NOT NULL CHECK (gender IN ('female', 'male', 'neutral')),
  age_range text CHECK (age_range IN ('young', 'middle-aged', 'senior')),
  accent text NOT NULL DEFAULT 'American',
  tone text NOT NULL,
  description text,
  sample_prompt text,
  orpheus_speaker text DEFAULT 'tara',
  recommended_industries text[] DEFAULT '{}',
  is_cloned boolean DEFAULT false,
  is_system boolean DEFAULT true,
  reference_audio_url text,
  model_config jsonb DEFAULT '{}',
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'processing', 'failed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_voice_models_workspace_id ON voice_models(workspace_id);
CREATE INDEX idx_voice_models_voice_id ON voice_models(voice_id);

-- =====================================================================
-- 2. VOICE_USAGE TABLE
-- =====================================================================
CREATE TABLE voice_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  call_session_id uuid REFERENCES call_sessions(id) ON DELETE SET NULL,
  voice_id text NOT NULL,
  tts_model text NOT NULL,
  input_chars integer NOT NULL DEFAULT 0,
  audio_duration_ms integer NOT NULL DEFAULT 0,
  ttfb_ms integer DEFAULT 0,
  total_latency_ms integer DEFAULT 0,
  cost_cents numeric(10, 4) DEFAULT 0,
  emotion_used text,
  industry text,
  sample_rate integer DEFAULT 24000,
  was_streaming boolean DEFAULT false,
  error text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_voice_usage_workspace_created ON voice_usage(workspace_id, created_at DESC);
CREATE INDEX idx_voice_usage_voice_id ON voice_usage(voice_id);
CREATE INDEX idx_voice_usage_call_session_id ON voice_usage(call_session_id);

-- =====================================================================
-- 3. VOICE_CONSENTS TABLE
-- =====================================================================
CREATE TABLE voice_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  phone text NOT NULL,
  consent_type text NOT NULL CHECK (consent_type IN ('recording', 'ai_voice', 'voice_clone', 'sms')),
  consent_given boolean NOT NULL DEFAULT false,
  consent_method text CHECK (consent_method IN ('verbal', 'written', 'digital', 'implied')),
  consent_text text,
  ip_address text,
  recorded_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  metadata jsonb DEFAULT '{}'
);

CREATE INDEX idx_voice_consents_workspace_phone ON voice_consents(workspace_id, phone);
CREATE INDEX idx_voice_consents_lead_id ON voice_consents(lead_id);

-- =====================================================================
-- 4. VOICE_QUALITY_LOGS TABLE
-- =====================================================================
CREATE TABLE voice_quality_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  call_session_id uuid REFERENCES call_sessions(id) ON DELETE SET NULL,
  voice_id text NOT NULL,
  tts_model text,
  avg_ttfb_ms integer,
  max_ttfb_ms integer,
  avg_mos_score numeric(3, 1),
  audio_glitches integer DEFAULT 0,
  barge_in_count integer DEFAULT 0,
  silence_ratio numeric(4, 3),
  user_sentiment text,
  call_duration_seconds integer,
  total_tts_calls integer DEFAULT 0,
  total_stt_calls integer DEFAULT 0,
  error_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_voice_quality_logs_workspace_created ON voice_quality_logs(workspace_id, created_at DESC);
CREATE INDEX idx_voice_quality_logs_call_session_id ON voice_quality_logs(call_session_id);

-- =====================================================================
-- 5. VOICE_AB_TESTS TABLE
-- =====================================================================
CREATE TABLE voice_ab_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  voice_a text NOT NULL,
  voice_b text NOT NULL,
  traffic_split numeric(3, 2) DEFAULT 0.50,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'paused', 'completed')),
  start_date timestamptz,
  end_date timestamptz,
  total_calls_a integer DEFAULT 0,
  total_calls_b integer DEFAULT 0,
  avg_satisfaction_a numeric(3, 1) DEFAULT 0,
  avg_satisfaction_b numeric(3, 1) DEFAULT 0,
  conversion_rate_a numeric(5, 4) DEFAULT 0,
  conversion_rate_b numeric(5, 4) DEFAULT 0,
  winner text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_voice_ab_tests_workspace_status ON voice_ab_tests(workspace_id, status);

-- =====================================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================================

-- Enable RLS on all voice tables
ALTER TABLE voice_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_quality_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_ab_tests ENABLE ROW LEVEL SECURITY;

-- voice_models: workspace members can read their workspace's voices + system voices
CREATE POLICY voice_models_select_own_workspace
  ON voice_models
  FOR SELECT
  USING (
    workspace_id IS NULL OR
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY voice_models_insert_own_workspace
  ON voice_models
  FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY voice_models_update_own_workspace
  ON voice_models
  FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY voice_models_delete_own_workspace
  ON voice_models
  FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

-- voice_usage: workspace members can read/write their workspace's usage data
CREATE POLICY voice_usage_select_own_workspace
  ON voice_usage
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY voice_usage_insert_own_workspace
  ON voice_usage
  FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY voice_usage_update_own_workspace
  ON voice_usage
  FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

-- voice_consents: workspace members can read/write their workspace's consent data
CREATE POLICY voice_consents_select_own_workspace
  ON voice_consents
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY voice_consents_insert_own_workspace
  ON voice_consents
  FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY voice_consents_update_own_workspace
  ON voice_consents
  FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

-- voice_quality_logs: workspace members can read/write their workspace's quality data
CREATE POLICY voice_quality_logs_select_own_workspace
  ON voice_quality_logs
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY voice_quality_logs_insert_own_workspace
  ON voice_quality_logs
  FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY voice_quality_logs_update_own_workspace
  ON voice_quality_logs
  FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

-- voice_ab_tests: workspace members can read/write their workspace's A/B tests
CREATE POLICY voice_ab_tests_select_own_workspace
  ON voice_ab_tests
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY voice_ab_tests_insert_own_workspace
  ON voice_ab_tests
  FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY voice_ab_tests_update_own_workspace
  ON voice_ab_tests
  FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY voice_ab_tests_delete_own_workspace
  ON voice_ab_tests
  FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );
