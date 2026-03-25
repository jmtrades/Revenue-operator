-- Commitment registry. Append-only; status transitions via UPDATE only (fulfilled_at, broken_at, escalated_at, status).
-- No DELETE. No TRUNCATE.

create table if not exists commitment_registry (
  commitment_id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  thread_id text not null,
  commitment_type text not null check (commitment_type in ('call_back', 'payment', 'document_send', 'appointment', 'info_send', 'other')),
  promised_at timestamptz not null default now(),
  promised_for timestamptz null,
  fulfilled_at timestamptz null,
  broken_at timestamptz null,
  escalated_at timestamptz null,
  status text not null default 'open' check (status in ('open', 'fulfilled', 'broken', 'escalated')),
  created_at timestamptz not null default now()
);

create index if not exists idx_commitment_registry_workspace_thread_promised
  on commitment_registry (workspace_id, thread_id, promised_for desc nulls last);

create index if not exists idx_commitment_registry_workspace_thread_status
  on commitment_registry (workspace_id, thread_id, status);
