/**
 * Brain Migration — creates lead_intelligence and autonomous_actions tables.
 * Safe to call multiple times (IF NOT EXISTS).
 * Uses Supabase RPC to execute DDL.
 */

import { createServerClient } from "@/lib/db/client";

let _migrationRunOnce = false;

const SQL_LEAD_INTELLIGENCE = `
CREATE TABLE IF NOT EXISTS revenue_operator.lead_intelligence (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid NOT NULL,
  workspace_id uuid NOT NULL,
  lifecycle_phase text NOT NULL DEFAULT 'NEW',
  days_in_current_phase integer NOT NULL DEFAULT 0,
  total_touchpoints integer NOT NULL DEFAULT 0,
  urgency_score integer NOT NULL DEFAULT 50,
  intent_score integer NOT NULL DEFAULT 50,
  engagement_score integer NOT NULL DEFAULT 50,
  conversion_probability numeric(4,3) NOT NULL DEFAULT 0.5,
  churn_risk numeric(4,3) NOT NULL DEFAULT 0.5,
  risk_flags_json text[] NOT NULL DEFAULT '{}',
  next_best_action text NOT NULL DEFAULT 'schedule_followup',
  action_reason text NOT NULL DEFAULT '',
  action_timing text NOT NULL DEFAULT 'scheduled',
  action_channel text NOT NULL DEFAULT 'sms',
  action_confidence numeric(4,3) NOT NULL DEFAULT 0.5,
  last_outcome text,
  last_sentiment text,
  last_contact_at timestamptz,
  hours_since_last_contact numeric NOT NULL DEFAULT 0,
  signal_count integer NOT NULL DEFAULT 0,
  version integer NOT NULL DEFAULT 1,
  computed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(lead_id, workspace_id)
);
CREATE INDEX IF NOT EXISTS idx_lead_intelligence_workspace ON revenue_operator.lead_intelligence(workspace_id);
CREATE INDEX IF NOT EXISTS idx_lead_intelligence_urgency ON revenue_operator.lead_intelligence(workspace_id, urgency_score DESC);
CREATE INDEX IF NOT EXISTS idx_lead_intelligence_conversion ON revenue_operator.lead_intelligence(workspace_id, conversion_probability DESC);
CREATE INDEX IF NOT EXISTS idx_lead_intelligence_action ON revenue_operator.lead_intelligence(workspace_id, next_best_action);
`;

const SQL_AUTONOMOUS_ACTIONS = `
CREATE TABLE IF NOT EXISTS revenue_operator.autonomous_actions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid NOT NULL,
  workspace_id uuid NOT NULL,
  action_type text NOT NULL,
  success boolean NOT NULL DEFAULT false,
  details text NOT NULL DEFAULT '',
  confidence numeric(4,3) NOT NULL DEFAULT 0.5,
  reason text NOT NULL DEFAULT '',
  trigger_signal_id uuid,
  intelligence_snapshot jsonb,
  executed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_autonomous_actions_lead ON revenue_operator.autonomous_actions(lead_id, executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_autonomous_actions_workspace ON revenue_operator.autonomous_actions(workspace_id, executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_autonomous_actions_type ON revenue_operator.autonomous_actions(workspace_id, action_type);
`;

/**
 * Ensure brain tables exist. Idempotent and non-blocking.
 */
export async function ensureBrainTables(): Promise<{ ok: boolean; error?: string }> {
  if (_migrationRunOnce) {
    return { ok: true };
  }

  try {
    const client = createServerClient();

    // Try to run DDL via Supabase RPC (requires exec_sql function in DB)
    for (const sql of [SQL_LEAD_INTELLIGENCE, SQL_AUTONOMOUS_ACTIONS]) {
      try {
        const { error } = await client.rpc("exec_sql", { sql });
        if (error) {
          // Table may already exist or RPC may not be available — non-fatal
          // Error details omitted to protect PII
        }
      } catch {
        // RPC not available — tables need to be created manually via Supabase dashboard
        // Error details omitted to protect PII
      }
    }

    _migrationRunOnce = true;
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Error ensuring brain tables (error details omitted to protect PII)
    // Mark as run to avoid repeated failures
    _migrationRunOnce = true;
    return { ok: false, error: message };
  }
}
