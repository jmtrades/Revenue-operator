-- operational_ledger: append-only operational events ledger

create table if not exists operational_ledger (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  event_type text not null,
  severity text not null check (severity in ('info','notice','warning')),
  subject_type text not null check (subject_type in ('workspace','thread','work_unit','approval','intent','public_record','connector','billing','executor')),
  subject_ref text not null,
  details_json jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index if not exists operational_ledger_workspace_occurred_at_idx
  on operational_ledger (workspace_id, occurred_at desc);

create index if not exists operational_ledger_event_type_occurred_at_idx
  on operational_ledger (event_type, occurred_at desc);

