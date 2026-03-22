-- call_coaching_results: Real-time coaching feedback for call transcripts
-- Stores coaching analysis including overall score, coaching points, and talk track suggestions

create table if not exists revenue_operator.call_coaching_results (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references revenue_operator.workspaces(id) on delete cascade,
  call_id text not null,
  overall_score integer not null check (overall_score >= 0 and overall_score <= 100),
  coaching_data jsonb not null,
  transcript text,
  created_at timestamptz not null default now()
);

create index if not exists call_coaching_results_workspace_idx on revenue_operator.call_coaching_results (workspace_id);
create index if not exists call_coaching_results_call_id_idx on revenue_operator.call_coaching_results (workspace_id, call_id);
create index if not exists call_coaching_results_created_at_idx on revenue_operator.call_coaching_results (workspace_id, created_at desc);
