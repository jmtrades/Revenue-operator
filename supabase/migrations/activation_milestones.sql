-- activation_milestones: append-only activation and adoption milestones

create table if not exists activation_milestones (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  milestone text not null,
  details_json jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index if not exists activation_milestones_workspace_occurred_at_idx
  on activation_milestones (workspace_id, occurred_at desc);

create index if not exists activation_milestones_milestone_occurred_at_idx
  on activation_milestones (milestone, occurred_at desc);

