-- Follow-up Automation Engine Migration
-- Created: 2026-03-17

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- WORKFLOWS TABLE
-- ============================================================================
CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  trigger TEXT NOT NULL CHECK (trigger IN (
    'missed_call',
    'appointment_booked',
    'no_show',
    'quote_sent',
    'manual',
    'contact_created',
    'days_inactive'
  )),
  trigger_config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  is_template BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX idx_workflows_workspace ON workflows(workspace_id);
CREATE INDEX idx_workflows_trigger ON workflows(trigger);
CREATE INDEX idx_workflows_active ON workflows(workspace_id, is_active) WHERE is_active = TRUE;

-- ============================================================================
-- WORKFLOW_STEPS TABLE
-- ============================================================================
CREATE TABLE workflow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('sms', 'call', 'email')),
  delay_seconds INTEGER DEFAULT 0,
  delay_condition TEXT NOT NULL DEFAULT 'after_trigger' CHECK (delay_condition IN (
    'after_trigger',
    'after_previous',
    'if_no_reply'
  )),
  message_template TEXT,
  call_script TEXT,
  email_subject TEXT,
  email_body TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workflow_id, step_order)
);

CREATE INDEX idx_workflow_steps_workflow ON workflow_steps(workflow_id);

-- ============================================================================
-- WORKFLOW_ENROLLMENTS TABLE
-- ============================================================================
CREATE TABLE workflow_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  current_step INTEGER DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
    'active',
    'completed',
    'paused',
    'stopped'
  )),
  stop_reason TEXT CHECK (stop_reason IN (
    'replied',
    'booked',
    'opted_out',
    'manual',
    'completed'
  )),
  enrolled_at TIMESTAMPTZ DEFAULT now(),
  last_step_at TIMESTAMPTZ,
  next_step_at TIMESTAMPTZ,
  stopped_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workflow_id, contact_id)
);

CREATE INDEX idx_enrollments_workspace ON workflow_enrollments(workspace_id);
CREATE INDEX idx_enrollments_active_next ON workflow_enrollments(workspace_id, next_step_at)
  WHERE status = 'active' AND next_step_at IS NOT NULL;
CREATE INDEX idx_enrollments_contact ON workflow_enrollments(contact_id);
CREATE INDEX idx_enrollments_workflow ON workflow_enrollments(workflow_id);

-- ============================================================================
-- USAGE_EVENTS TABLE
-- ============================================================================
CREATE TABLE usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'voice_minute',
    'sms_sent',
    'sms_received',
    'email_sent'
  )),
  quantity DECIMAL(10, 2) NOT NULL DEFAULT 1,
  cost_cents INTEGER NOT NULL DEFAULT 0,
  reference_id UUID,
  metadata JSONB DEFAULT '{}',
  recorded_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_usage_events_workspace ON usage_events(workspace_id);
CREATE INDEX idx_usage_events_type ON usage_events(event_type);
CREATE INDEX idx_usage_events_date ON usage_events(workspace_id, recorded_at);

-- ============================================================================
-- ANALYTICS_DAILY TABLE
-- ============================================================================
CREATE TABLE analytics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  calls_answered INTEGER DEFAULT 0,
  calls_missed INTEGER DEFAULT 0,
  leads_captured INTEGER DEFAULT 0,
  appointments_booked INTEGER DEFAULT 0,
  estimated_revenue DECIMAL(12, 2) DEFAULT 0,
  minutes_used DECIMAL(8, 2) DEFAULT 0,
  follow_ups_sent INTEGER DEFAULT 0,
  no_shows_recovered INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, date)
);

CREATE INDEX idx_analytics_daily_workspace ON analytics_daily(workspace_id);
CREATE INDEX idx_analytics_daily_date ON analytics_daily(workspace_id, date);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_daily ENABLE ROW LEVEL SECURITY;

-- Workflows policies
CREATE POLICY "Users can view workflows in their workspace"
  ON workflows FOR SELECT
  USING (workspace_id IN (
    SELECT id FROM workspaces WHERE id = auth.jwt() ->> 'workspace_id'
  ));

CREATE POLICY "Users can create workflows in their workspace"
  ON workflows FOR INSERT
  WITH CHECK (workspace_id IN (
    SELECT id FROM workspaces WHERE id = auth.jwt() ->> 'workspace_id'
  ));

CREATE POLICY "Users can update workflows in their workspace"
  ON workflows FOR UPDATE
  USING (workspace_id IN (
    SELECT id FROM workspaces WHERE id = auth.jwt() ->> 'workspace_id'
  ));

CREATE POLICY "Users can delete workflows in their workspace"
  ON workflows FOR DELETE
  USING (workspace_id IN (
    SELECT id FROM workspaces WHERE id = auth.jwt() ->> 'workspace_id'
  ));

-- Workflow steps policies
CREATE POLICY "Users can manage workflow steps in their workspace"
  ON workflow_steps FOR ALL
  USING (workflow_id IN (
    SELECT id FROM workflows WHERE workspace_id = auth.jwt() ->> 'workspace_id'
  ));

-- Workflow enrollments policies
CREATE POLICY "Users can view enrollments in their workspace"
  ON workflow_enrollments FOR SELECT
  USING (workspace_id IN (
    SELECT id FROM workspaces WHERE id = auth.jwt() ->> 'workspace_id'
  ));

CREATE POLICY "Users can create enrollments in their workspace"
  ON workflow_enrollments FOR INSERT
  WITH CHECK (workspace_id IN (
    SELECT id FROM workspaces WHERE id = auth.jwt() ->> 'workspace_id'
  ));

CREATE POLICY "Users can update enrollments in their workspace"
  ON workflow_enrollments FOR UPDATE
  USING (workspace_id IN (
    SELECT id FROM workspaces WHERE id = auth.jwt() ->> 'workspace_id'
  ));

-- Usage events policies
CREATE POLICY "Users can view usage events in their workspace"
  ON usage_events FOR SELECT
  USING (workspace_id IN (
    SELECT id FROM workspaces WHERE id = auth.jwt() ->> 'workspace_id'
  ));

CREATE POLICY "System can insert usage events"
  ON usage_events FOR INSERT
  WITH CHECK (workspace_id IN (
    SELECT id FROM workspaces WHERE id = auth.jwt() ->> 'workspace_id'
  ));

-- Analytics daily policies
CREATE POLICY "Users can view analytics for their workspace"
  ON analytics_daily FOR SELECT
  USING (workspace_id IN (
    SELECT id FROM workspaces WHERE id = auth.jwt() ->> 'workspace_id'
  ));

CREATE POLICY "System can manage analytics for workspace"
  ON analytics_daily FOR ALL
  USING (workspace_id IN (
    SELECT id FROM workspaces WHERE id = auth.jwt() ->> 'workspace_id'
  ));

-- ============================================================================
-- TIMESTAMPS AND TRIGGERS
-- ============================================================================

-- Update updated_at timestamp for workflows
CREATE OR REPLACE FUNCTION update_workflows_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER workflows_updated_at
  BEFORE UPDATE ON workflows
  FOR EACH ROW
  EXECUTE FUNCTION update_workflows_updated_at();

-- Update updated_at timestamp for workflow_steps
CREATE OR REPLACE FUNCTION update_workflow_steps_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER workflow_steps_updated_at
  BEFORE UPDATE ON workflow_steps
  FOR EACH ROW
  EXECUTE FUNCTION update_workflow_steps_updated_at();

-- Update updated_at timestamp for workflow_enrollments
CREATE OR REPLACE FUNCTION update_workflow_enrollments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER workflow_enrollments_updated_at
  BEFORE UPDATE ON workflow_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION update_workflow_enrollments_updated_at();

-- Update updated_at timestamp for analytics_daily
CREATE OR REPLACE FUNCTION update_analytics_daily_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER analytics_daily_updated_at
  BEFORE UPDATE ON analytics_daily
  FOR EACH ROW
  EXECUTE FUNCTION update_analytics_daily_updated_at();
