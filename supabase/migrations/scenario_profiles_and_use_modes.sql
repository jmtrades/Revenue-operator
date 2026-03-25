-- Scenario profiles and use modes. Append-only / upsert-only. No deletes.
-- UI language: "Purpose" and "Operating posture" only; internal keys mode_key, profile_id.

-- A) use_modes (seeded; no deletes)
create table if not exists use_modes (
  mode_key text primary key,
  display_name text not null,
  description_line text not null
);

-- Seed minimal system modes (institutional labels only)
insert into use_modes (mode_key, display_name, description_line) values
  ('triage', 'Inbound triage', 'Route and qualify inbound contact.'),
  ('list_execution', 'List execution', 'Execute a list under declared purpose.'),
  ('recovery', 'Recovery', 'Recover stalled or lapsed commitments.'),
  ('front_desk', 'Front desk', 'Handle incoming requests and routing.'),
  ('reactivation', 'Reactivation', 'Re-engage lapsed contacts.'),
  ('compliance_shield', 'Compliance shield', 'Governed contact with review emphasis.'),
  ('concierge', 'Concierge', 'Structured follow-up and confirmation.')
on conflict (mode_key) do update set
  display_name = excluded.display_name,
  description_line = excluded.description_line;

-- B) scenario_profiles (per workspace; unique workspace_id, profile_id)
create table if not exists scenario_profiles (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  profile_id text not null,
  mode_key text not null references use_modes(mode_key),
  display_name text not null,
  primary_objective text not null,
  secondary_objectives_json jsonb not null default '[]',
  default_review_level text not null default 'preview_required',
  default_jurisdiction text not null default 'UNSPECIFIED',
  rules_json jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(workspace_id, profile_id)
);

create index if not exists idx_scenario_profiles_workspace on scenario_profiles (workspace_id);

-- C) workspace_scenario_state (one row per workspace; upsert only)
create table if not exists workspace_scenario_state (
  workspace_id uuid primary key,
  active_profile_id text null,
  active_mode_key text not null default 'triage',
  updated_at timestamptz not null default now()
);
