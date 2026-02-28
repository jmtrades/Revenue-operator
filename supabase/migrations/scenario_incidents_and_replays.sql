-- Scenario incidents and replays. Append-only. No DELETE. No TRUNCATE.

create table if not exists scenario_incidents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  thread_id text,
  channel text not null check (channel in ('voice', 'message', 'system', 'inbound')),
  scenario_category text not null,
  symptom_key text,
  structured_context_json jsonb not null default '{}',
  expected_outcome_type text not null,
  expected_next_required_action text,
  expected_stop_reason text,
  raised_at timestamptz not null default now()
);

create index if not exists idx_scenario_incidents_workspace_raised
  on scenario_incidents (workspace_id, raised_at desc);

create index if not exists idx_scenario_incidents_workspace_category
  on scenario_incidents (workspace_id, scenario_category);

create index if not exists idx_scenario_incidents_workspace_thread_raised
  on scenario_incidents (workspace_id, thread_id, raised_at desc nulls last);

create table if not exists scenario_replays (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references scenario_incidents(id) on delete restrict,
  replay_hash text not null,
  passed boolean not null,
  result_json jsonb not null default '{}',
  recorded_at timestamptz not null default now()
);

create index if not exists idx_scenario_replays_incident_recorded
  on scenario_replays (incident_id, recorded_at desc);
