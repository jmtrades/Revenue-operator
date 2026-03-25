-- Strategy effectiveness registry. Append-only. No DELETE. No TRUNCATE.

create table if not exists strategy_effectiveness_registry (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  thread_id text,
  variant_key text not null,
  objective text,
  outcome_type text not null,
  commitment_delta int not null default 0,
  goodwill_delta int not null default 0,
  escalation_triggered boolean not null default false,
  recorded_at timestamptz not null default now()
);

create index if not exists idx_strategy_effectiveness_workspace_recorded
  on strategy_effectiveness_registry (workspace_id, recorded_at desc);

create index if not exists idx_strategy_effectiveness_workspace_variant
  on strategy_effectiveness_registry (workspace_id, variant_key);

create index if not exists idx_strategy_effectiveness_workspace_outcome
  on strategy_effectiveness_registry (workspace_id, outcome_type);
