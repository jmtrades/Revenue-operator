-- Add canonical trial end timestamp column (plural) required by spec.
-- Backfill from existing `trial_end_at` or `protection_renewal_at` when present.

alter table workspaces
  add column if not exists trial_ends_at timestamptz;

-- Prefer existing trial_end_at when available.
update workspaces
set trial_ends_at = trial_end_at
where trial_ends_at is null
  and trial_end_at is not null;

-- Fallback for older rows that only have protection_renewal_at.
update workspaces
set trial_ends_at = protection_renewal_at
where trial_ends_at is null
  and protection_renewal_at is not null;

