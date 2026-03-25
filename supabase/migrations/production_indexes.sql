-- Production-safe indexes for cron and export queries. No DROP, no TRUNCATE, no DELETE.

-- action_intents: completed_at for completion lookups (workspace_id, created_at already exists)
create index if not exists idx_action_intents_workspace_completed_at
  on revenue_operator.action_intents (workspace_id, completed_at desc nulls last)
  where completed_at is not null;

-- connector_events: (workspace_id, received_at) already exists as idx_connector_events_workspace_received
-- operational_ledger: (workspace_id, occurred_at) already exists as operational_ledger_workspace_occurred_at_idx
-- activation_milestones: (workspace_id, occurred_at) already exists
-- public_record_views: (external_ref, viewed_at) already exists as public_record_views_external_ref_viewed_at_idx
-- system_cron_heartbeats: (job_name, last_ran_at) added in production_system_cron_heartbeats.sql

-- Ensure executor_outcome_reports has workspace + occurred_at for retention/export
create index if not exists executor_outcome_reports_workspace_occurred_at_idx
  on executor_outcome_reports (workspace_id, occurred_at desc);
