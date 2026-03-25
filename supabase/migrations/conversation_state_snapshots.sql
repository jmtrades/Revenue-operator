-- Conversation state snapshots. Append-only. No DELETE. No TRUNCATE.

create table if not exists conversation_state_snapshots (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  thread_id text not null,
  stage text not null,
  objection_stage text,
  compliance_stage text,
  decision_confidence integer,
  goodwill_score integer,
  friction_score integer,
  drift_score integer,
  contradiction_score integer,
  snapshot_json jsonb not null default '{}',
  recorded_at timestamptz not null default now()
);

create index if not exists idx_conversation_state_snapshots_workspace_thread_recorded
  on conversation_state_snapshots (workspace_id, thread_id, recorded_at desc);
