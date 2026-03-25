-- Universal outcome registry. Append-only. INSERT only. No DELETE. No TRUNCATE.

create table if not exists universal_outcomes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  thread_id text,
  work_unit_id uuid,
  action_intent_id uuid,
  channel text not null check (channel in ('voice', 'message', 'system')),
  outcome_type text not null,
  outcome_confidence text not null check (outcome_confidence in ('low', 'medium', 'high')),
  next_required_action text check (next_required_action is null or next_required_action in (
    'schedule_followup', 'request_disclosure_confirmation', 'escalate_to_human',
    'pause_execution', 'record_commitment', 'none'
  )),
  structured_payload_json jsonb not null default '{}',
  recorded_at timestamptz not null default now()
);

create index if not exists idx_universal_outcomes_workspace_thread_recorded
  on universal_outcomes (workspace_id, thread_id, recorded_at desc nulls last);

create index if not exists idx_universal_outcomes_workspace_outcome_type
  on universal_outcomes (workspace_id, outcome_type);

create index if not exists idx_universal_outcomes_workspace_next_action
  on universal_outcomes (workspace_id, next_required_action);
