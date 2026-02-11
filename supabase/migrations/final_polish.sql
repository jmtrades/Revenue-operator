-- Final Polish Before Customer Onboarding
-- Run after final_adoption_upgrade

BEGIN;

ALTER TABLE revenue_operator.escalation_logs
  ADD COLUMN IF NOT EXISTS hold_until timestamptz,
  ADD COLUMN IF NOT EXISTS holding_message_sent boolean DEFAULT false;

ALTER TABLE revenue_operator.outbound_events_log
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS attempt_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_attempts integer DEFAULT 3,
  ADD COLUMN IF NOT EXISTS next_retry_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_error text;

ALTER TABLE revenue_operator.webhook_configs
  ADD COLUMN IF NOT EXISTS max_attempts integer DEFAULT 3,
  ADD COLUMN IF NOT EXISTS event_lead_qualified boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS event_call_booked boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS event_deal_at_risk boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS event_deal_won boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS event_lead_reactivated boolean DEFAULT true;

ALTER TABLE revenue_operator.settings
  ADD COLUMN IF NOT EXISTS scheduling_rules jsonb DEFAULT '{"max_calls_per_day":20,"min_notice_minutes":60,"blocked_days":[],"preferred_hours_start":"09:00","preferred_hours_end":"17:00","reserve_for_high_probability":true}',
  ADD COLUMN IF NOT EXISTS escalation_timeout_hours integer DEFAULT 24;

ALTER TABLE revenue_operator.business_memory
  ADD COLUMN IF NOT EXISTS source_type text DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS confidence numeric DEFAULT 0.5,
  ADD COLUMN IF NOT EXISTS sample_size integer,
  ADD COLUMN IF NOT EXISTS last_updated timestamptz DEFAULT now();

CREATE TABLE IF NOT EXISTS revenue_operator.webhook_dlq (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  entity_id uuid,
  payload jsonb DEFAULT '{}',
  endpoint_url text NOT NULL,
  attempt_count integer DEFAULT 0,
  last_error text,
  created_at timestamptz DEFAULT now()
);

COMMIT;
