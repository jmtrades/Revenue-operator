-- public_record_views: privacy-safe tracking of public record views

create table if not exists public_record_views (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  external_ref text not null,
  viewed_at timestamptz not null default now(),
  viewer_fingerprint_hash text null,
  referrer_domain text null,
  country_code text null
);

create index if not exists public_record_views_workspace_viewed_at_idx
  on public_record_views (workspace_id, viewed_at desc);

create index if not exists public_record_views_external_ref_viewed_at_idx
  on public_record_views (external_ref, viewed_at desc);

