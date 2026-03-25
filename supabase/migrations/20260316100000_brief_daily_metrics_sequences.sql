-- Implementation Brief V2: daily_metrics (analytics rollup), follow-up sequences, industry_templates.
-- Safe to run: CREATE TABLE IF NOT EXISTS.

-- Daily metrics: analytics rollup per workspace per day (Brief Section 2 & 6).
CREATE TABLE IF NOT EXISTS revenue_operator.daily_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  calls_answered INTEGER NOT NULL DEFAULT 0,
  calls_missed INTEGER NOT NULL DEFAULT 0,
  appointments_booked INTEGER NOT NULL DEFAULT 0,
  no_shows INTEGER NOT NULL DEFAULT 0,
  no_shows_recovered INTEGER NOT NULL DEFAULT 0,
  follow_ups_sent INTEGER NOT NULL DEFAULT 0,
  leads_captured INTEGER NOT NULL DEFAULT 0,
  revenue_estimated_cents INTEGER NOT NULL DEFAULT 0,
  response_time_avg_seconds INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, date)
);
CREATE INDEX IF NOT EXISTS idx_daily_metrics_workspace_date ON revenue_operator.daily_metrics(workspace_id, date DESC);
ALTER TABLE revenue_operator.daily_metrics ENABLE ROW LEVEL SECURITY;

-- Follow-up sequences: multi-step sequences (Brief Section 2, Phase 2/3).
CREATE TABLE IF NOT EXISTS revenue_operator.follow_up_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL DEFAULT 'manual' CHECK (trigger_type IN (
    'missed_call', 'new_lead', 'no_show', 'quote_sent', 'dormant_contact', 'manual'
  )),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_follow_up_sequences_workspace ON revenue_operator.follow_up_sequences(workspace_id);
ALTER TABLE revenue_operator.follow_up_sequences ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS revenue_operator.sequence_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID NOT NULL REFERENCES revenue_operator.follow_up_sequences(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('sms', 'email', 'call')),
  delay_minutes INTEGER NOT NULL DEFAULT 0,
  template_content TEXT,
  conditions JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sequence_steps_sequence ON revenue_operator.sequence_steps(sequence_id);
ALTER TABLE revenue_operator.sequence_steps ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS revenue_operator.sequence_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID NOT NULL REFERENCES revenue_operator.follow_up_sequences(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES revenue_operator.leads(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled', 'paused')),
  current_step INTEGER NOT NULL DEFAULT 0,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sequence_enrollments_sequence ON revenue_operator.sequence_enrollments(sequence_id);
CREATE INDEX IF NOT EXISTS idx_sequence_enrollments_contact ON revenue_operator.sequence_enrollments(contact_id);
ALTER TABLE revenue_operator.sequence_enrollments ENABLE ROW LEVEL SECURITY;

-- industry_templates: pre-built packs per vertical (Brief Section 2, industry packs).
CREATE TABLE IF NOT EXISTS revenue_operator.industry_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  industry_slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  default_greeting TEXT,
  default_scripts JSONB NOT NULL DEFAULT '[]',
  default_faq JSONB NOT NULL DEFAULT '[]',
  default_follow_up_cadence JSONB NOT NULL DEFAULT '[]',
  recommended_features TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_industry_templates_slug ON revenue_operator.industry_templates(industry_slug);
ALTER TABLE revenue_operator.industry_templates ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE revenue_operator.daily_metrics IS 'Analytics rollup per workspace per day (Brief Section 6)';
COMMENT ON TABLE revenue_operator.follow_up_sequences IS 'Multi-step follow-up sequences (Brief Phase 2/3)';
COMMENT ON TABLE revenue_operator.industry_templates IS 'Industry pack templates (Brief industry packs)';
