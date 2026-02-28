-- executor_observability: executor heartbeats and outcome reports

create table if not exists executor_heartbeats (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  executor_id text not null,
  capabilities_json jsonb not null default '{}'::jsonb,
  version text null,
  last_seen_at timestamptz not null default now()
);

create unique index if not exists executor_heartbeats_workspace_executor_uidx
  on executor_heartbeats (workspace_id, executor_id);

create index if not exists executor_heartbeats_workspace_last_seen_idx
  on executor_heartbeats (workspace_id, last_seen_at desc);

create table if not exists executor_outcome_reports (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  external_id text not null,
  action_intent_id uuid null,
  status text not null check (status in ('succeeded','failed','skipped')),
  details_json jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create unique index if not exists executor_outcome_reports_workspace_external_uidx
  on executor_outcome_reports (workspace_id, external_id);

create index if not exists executor_outcome_reports_workspace_occurred_at_idx
  on executor_outcome_reports (workspace_id, occurred_at desc);

create index if not exists executor_outcome_reports_status_occurred_at_idx
  on executor_outcome_reports (status, occurred_at desc);

