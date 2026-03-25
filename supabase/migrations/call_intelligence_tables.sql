-- Call Intelligence: learn from real calls to improve agent behavior.
-- call_examples: uploaded/recorded calls or pasted transcripts.
-- call_insights: extracted patterns (tone, objection handling, etc.) for user review and apply-to-agent.

create table if not exists revenue_operator.call_examples (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references revenue_operator.workspaces(id) on delete cascade,
  agent_id uuid null references revenue_operator.agents(id) on delete set null,
  title text,
  source text not null default 'upload',
  audio_url text,
  transcript text,
  duration_seconds integer,
  call_type text,
  analysis jsonb,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create index if not exists call_examples_workspace_created_idx on revenue_operator.call_examples (workspace_id, created_at desc);
create index if not exists call_examples_workspace_status_idx on revenue_operator.call_examples (workspace_id, status);

create table if not exists revenue_operator.call_insights (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references revenue_operator.workspaces(id) on delete cascade,
  call_example_id uuid not null references revenue_operator.call_examples(id) on delete cascade,
  category text not null,
  insight text not null,
  example_from_transcript text,
  confidence real not null default 0.8,
  applied boolean not null default false,
  dismissed boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists call_insights_workspace_idx on revenue_operator.call_insights (workspace_id);
create index if not exists call_insights_call_example_idx on revenue_operator.call_insights (call_example_id);
create index if not exists call_insights_applied_idx on revenue_operator.call_insights (workspace_id, applied) where applied = true;
