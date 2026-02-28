-- Strategic pattern registry. One row per (workspace_id, thread_id). UPSERT only. No DELETE. No TRUNCATE.

create table if not exists strategic_pattern_registry (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  thread_id text not null,
  persuasion_attempts int not null default 0,
  clarification_attempts int not null default 0,
  compliance_forward_attempts int not null default 0,
  hard_close_attempts int not null default 0,
  escalation_attempts int not null default 0,
  last_updated_at timestamptz not null default now(),
  unique (workspace_id, thread_id)
);

create index if not exists idx_strategic_pattern_registry_workspace_thread
  on strategic_pattern_registry (workspace_id, thread_id);
