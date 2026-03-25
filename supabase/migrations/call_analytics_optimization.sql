-- Call analytics: store post-call insights for optimization suggestions.
-- Populated by post-call transcript analysis (e.g. transfer reasons, unanswered topics).

create table if not exists revenue_operator.call_analytics (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references revenue_operator.workspaces(id) on delete cascade,
  call_session_id uuid,
  call_outcome text,
  transfer_reason text,
  topics_discussed jsonb,
  unanswered_questions jsonb,
  created_at timestamptz not null default now()
);

create index if not exists call_analytics_workspace_created_idx on revenue_operator.call_analytics (workspace_id, created_at desc);

-- Optimization suggestions (aggregated or one-off) for the dashboard.
create table if not exists revenue_operator.optimization_suggestions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references revenue_operator.workspaces(id) on delete cascade,
  title text not null,
  description text,
  action_label text,
  action_href text,
  dismissed boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists optimization_suggestions_workspace_idx on revenue_operator.optimization_suggestions (workspace_id) where dismissed = false;
