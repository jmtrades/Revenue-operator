# Supabase Production Database Checklist

Verification steps for production database readiness.

## 1. Migrations Applied

### Verification Command

```bash
# Connect to production Supabase database
supabase db push

# OR apply migrations manually via Supabase Dashboard → SQL Editor
```

### Migration Files (in order)

All migrations in `supabase/migrations/` must be applied. Key migrations:

- `shared_transaction_assurance.sql` - Core shared transactions table
- `reciprocal_events_threading.sql` - Reciprocal events table
- `operational_responsibilities.sql` - Responsibilities table
- `thread_participants.sql` - Thread participants
- `thread_assignments.sql` - Thread assignments
- `thread_evidence.sql` - Thread evidence
- `thread_reference_memory.sql` - Reference memory
- `outcome_dependencies.sql` - Outcome dependencies
- `thread_amendments.sql` - Thread amendments
- `proof_capsules.sql` - Proof capsules
- `orientation_layer.sql` - Orientation records
- `workspace_installation_confirmation.sql` - Installation confirmation
- `public_corridor_sessions.sql` - Public corridor sessions
- `participant_org_hints.sql` - Participant org hints
- `temporal_stability_records.sql` - Temporal stability records

**Check:** Run `SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'revenue_operator';` - should return 100+ tables.

## 2. Required Tables Exist

Verify these tables exist in `revenue_operator` schema:

- [ ] `shared_transactions`
- [ ] `reciprocal_events`
- [ ] `operational_responsibilities`
- [ ] `thread_participants`
- [ ] `thread_assignments`
- [ ] `thread_evidence`
- [ ] `thread_reference_memory`
- [ ] `outcome_dependencies`
- [ ] `thread_amendments`
- [ ] `proof_capsules`
- [ ] `orientation_records`
- [ ] `assurance_attempt_marker`
- [ ] `cron_heartbeats` (or equivalent)
- [ ] `rate_limits`
- [ ] `workspace_orientation_state`
- [ ] `public_corridor_sessions`
- [ ] `participant_org_hints`
- [ ] `temporal_stability_records`
- [ ] `workspaces`
- [ ] `protocol_events`

**Verification Query:**

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'revenue_operator' 
AND table_name IN (
  'shared_transactions',
  'reciprocal_events',
  'operational_responsibilities',
  'thread_participants',
  'thread_assignments',
  'thread_evidence',
  'thread_reference_memory',
  'outcome_dependencies',
  'thread_amendments',
  'proof_capsules',
  'orientation_records',
  'assurance_attempt_marker',
  'cron_heartbeats',
  'rate_limits',
  'workspace_orientation_state'
)
ORDER BY table_name;
```

All tables should exist.

## 3. Row Level Security (RLS) Expectations

### Public Endpoints (No Auth Required)

- `/api/public/work/[external_ref]` - Must work without auth
- `/api/public/work/[external_ref]/respond` - Must work without auth
- `/api/public/shared-transactions/acknowledge` - Must work without auth

**Check:** These endpoints must NOT leak:
- Internal `id` fields
- `workspace_id` in responses
- `thread_id` in responses
- Any internal identifiers

**Verification:** Call endpoint without auth header, verify response shape contains only `external_ref` or public fields.

### Private Endpoints (Auth Required)

- `/api/operational/*` - Must require `requireWorkspaceAccess` when `SESSION_ENABLED=true`
- `/api/dashboard/*` - Must require session when `SESSION_ENABLED=true`
- `/api/system/core-status` - Must require workspace access

**Check:** These endpoints must:
- Return 401 if no session/auth
- Return 403 if workspace_id doesn't match session
- Never expose internal IDs in error messages

## 4. Indexes and Constraints

### Critical Indexes

Verify these indexes exist:

- [ ] `idx_shared_transactions_external_ref` on `shared_transactions(external_ref)`
- [ ] `idx_reciprocal_events_thread_recorded` on `reciprocal_events(thread_id, recorded_at)`
- [ ] `idx_orientation_records_workspace_created` on `orientation_records(workspace_id, created_at)`
- [ ] `idx_outcome_dependencies_source_thread` on `outcome_dependencies(source_thread_id)`
- [ ] `idx_thread_reference_memory_thread` on `thread_reference_memory(thread_id)`

**Verification Query:**

```sql
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'revenue_operator' 
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
```

### Unique Constraints

- [ ] `shared_transactions.external_ref` must be unique
- [ ] `operational_responsibilities(thread_id, required_action)` must be unique when `satisfied=false`
- [ ] `thread_reference_memory(workspace_id, reference_context_type, reference_context_id)` must be unique

## 5. Foreign Key Constraints

Verify foreign keys exist:

- [ ] `reciprocal_events.thread_id` → `shared_transactions.id`
- [ ] `operational_responsibilities.thread_id` → `shared_transactions.id`
- [ ] `outcome_dependencies.source_thread_id` → `shared_transactions.id`
- [ ] `thread_amendments.thread_id` → `shared_transactions.id`

**Verification Query:**

```sql
SELECT
  tc.table_name, 
  kcu.column_name, 
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_schema = 'revenue_operator'
AND tc.table_name IN (
  'reciprocal_events',
  'operational_responsibilities',
  'outcome_dependencies',
  'thread_amendments'
);
```

## 6. Append-Only Tables Verification

These tables must be append-only (no UPDATE/DELETE allowed):

- [ ] `orientation_records` - INSERT only
- [ ] `reciprocal_events` - INSERT only
- [ ] `thread_amendments` - INSERT only
- [ ] `outcome_dependencies` - INSERT only, UPDATE only for `resolved_at`
- [ ] `operational_responsibilities` - INSERT only, UPDATE only for `satisfied`/`resolved_at`

**Check:** Verify no DELETE triggers or policies exist on these tables.

## 7. Production Readiness Checklist

- [ ] All migrations applied in order
- [ ] All required tables exist
- [ ] All critical indexes exist
- [ ] Unique constraints enforced
- [ ] Foreign keys enforced
- [ ] RLS policies allow public endpoints without auth
- [ ] RLS policies block private endpoints without auth
- [ ] No internal IDs exposed in public endpoints
- [ ] Append-only tables protected

## Post-Deploy Verification

After deployment, run:

```sql
-- Check recent activity
SELECT COUNT(*) FROM revenue_operator.orientation_records WHERE created_at > NOW() - INTERVAL '1 hour';

-- Check cron heartbeats
SELECT * FROM revenue_operator.cron_heartbeats ORDER BY last_ran_at DESC LIMIT 10;

-- Check rate limits table exists
SELECT COUNT(*) FROM revenue_operator.rate_limits;
```

All queries should succeed without errors.
