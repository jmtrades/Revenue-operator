-- Knowledge Gaps: stores questions the AI couldn't answer during calls
-- Surfaced in dashboard so users can add answers to make AI smarter
CREATE TABLE IF NOT EXISTS knowledge_gaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  occurrences INT NOT NULL DEFAULT 1,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  call_session_id UUID REFERENCES call_sessions(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'dismissed')),
  resolved_answer TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_gaps_workspace_status
  ON knowledge_gaps(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_knowledge_gaps_workspace_occurrences
  ON knowledge_gaps(workspace_id, occurrences DESC);

-- Call Analytics: per-call metrics for self-learning system
-- Populated by post-call analysis background job
CREATE TABLE IF NOT EXISTS call_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  call_session_id UUID NOT NULL REFERENCES call_sessions(id) ON DELETE CASCADE,
  duration_seconds INT,
  outcome TEXT CHECK (outcome IN ('booked', 'transferred', 'resolved', 'voicemail', 'abandoned', 'no_answer', 'other')),
  sentiment_score NUMERIC(3,2) CHECK (sentiment_score >= -1 AND sentiment_score <= 1),
  topics TEXT[] DEFAULT '{}',
  knowledge_gaps_detected TEXT[] DEFAULT '{}',
  objections_handled TEXT[] DEFAULT '{}',
  booking_attempted BOOLEAN DEFAULT false,
  booking_succeeded BOOLEAN DEFAULT false,
  caller_satisfied BOOLEAN,
  summary TEXT,
  analyzed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT unique_call_analytics UNIQUE (call_session_id)
);

CREATE INDEX IF NOT EXISTS idx_call_analytics_workspace
  ON call_analytics(workspace_id, analyzed_at DESC);
CREATE INDEX IF NOT EXISTS idx_call_analytics_outcome
  ON call_analytics(workspace_id, outcome);

-- Revenue Recovery Actions: tracks what was recovered and ROI
CREATE TABLE IF NOT EXISTS revenue_recovery_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('missed_calls', 'cold_leads', 'no_shows', 'open_quotes', 'dormant_customers')),
  lead_ids UUID[] DEFAULT '{}',
  action_taken TEXT NOT NULL,
  estimated_value NUMERIC(10,2) DEFAULT 0,
  actual_value NUMERIC(10,2),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_recovery_actions_workspace
  ON revenue_recovery_actions(workspace_id, created_at DESC);

-- Enable RLS
ALTER TABLE knowledge_gaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_recovery_actions ENABLE ROW LEVEL SECURITY;

-- RLS policies: workspace members can read/write their own data
CREATE POLICY "workspace_members_knowledge_gaps" ON knowledge_gaps
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "workspace_members_call_analytics" ON call_analytics
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "workspace_members_recovery_actions" ON revenue_recovery_actions
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );
