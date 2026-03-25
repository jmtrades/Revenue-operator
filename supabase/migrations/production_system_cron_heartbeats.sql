-- system_cron_heartbeats: cron job last run times. Used by hosted-executor concurrency guard and founder export.
-- No DELETE. Append-only semantics via upsert on job_name.

create table if not exists system_cron_heartbeats (
  job_name text primary key,
  last_ran_at timestamptz not null default now()
);

create index if not exists system_cron_heartbeats_last_ran_at_idx
  on system_cron_heartbeats (job_name, last_ran_at desc);

comment on table system_cron_heartbeats is 'Cron cycle timestamps. No DELETE. Used for concurrency guard and founder export.';
