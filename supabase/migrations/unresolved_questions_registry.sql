-- Unresolved questions registry. Append-only. No DELETE. No TRUNCATE.
-- resolved_at set via UPDATE for closure only; no row deletion.

create table if not exists unresolved_questions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  thread_id text not null,
  question_type text not null,
  question_text_short text not null,
  raised_at timestamptz not null default now(),
  resolved_at timestamptz null,
  resolution_type text null,
  source_channel text not null check (source_channel in ('voice', 'message', 'system'))
);

create index if not exists idx_unresolved_questions_workspace_thread_raised
  on unresolved_questions (workspace_id, thread_id, raised_at desc);

create index if not exists idx_unresolved_questions_workspace_thread_resolved
  on unresolved_questions (workspace_id, thread_id, resolved_at);
