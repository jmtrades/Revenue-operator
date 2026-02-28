-- workspace_invites: append-only invite tokens (enterprise). No email sending.

create table if not exists workspace_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  invite_token text not null,
  created_at timestamptz not null default now(),
  accepted_at timestamptz null,
  accepted_by uuid null
);

create unique index if not exists workspace_invites_token_uidx on workspace_invites (invite_token);
create index if not exists workspace_invites_workspace_created_idx on workspace_invites (workspace_id, created_at desc);
