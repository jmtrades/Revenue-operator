-- Data retention: archive tables and archived_at flag. No DELETE; append-only pattern.

-- public_record_views: add archived_at, create archive
alter table if exists public_record_views add column if not exists archived_at timestamptz null;
create table if not exists public_record_views_archive (
  id uuid primary key,
  workspace_id uuid not null,
  external_ref text not null,
  viewed_at timestamptz not null,
  viewer_fingerprint_hash text null,
  referrer_domain text null,
  country_code text null,
  archived_at timestamptz not null default now()
);

-- executor_outcome_reports: add archived_at, create archive
alter table if exists executor_outcome_reports add column if not exists archived_at timestamptz null;
create table if not exists executor_outcome_reports_archive (
  id uuid primary key,
  workspace_id uuid not null,
  external_id text not null,
  action_intent_id uuid null,
  status text not null,
  details_json jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null,
  archived_at timestamptz not null default now()
);

-- operational_ledger: add archived_at, create archive
alter table if exists operational_ledger add column if not exists archived_at timestamptz null;
create table if not exists operational_ledger_archive (
  id uuid primary key,
  workspace_id uuid not null,
  event_type text not null,
  severity text not null,
  subject_type text not null,
  subject_ref text not null,
  details_json jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null,
  archived_at timestamptz not null default now()
);
