-- Workspace notification preferences JSONB column
alter table public.workspaces
  add column if not exists notification_preferences jsonb default '{}'::jsonb;

