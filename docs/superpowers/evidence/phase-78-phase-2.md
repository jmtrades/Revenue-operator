# Phase 78 / Phase 2 — Database Access Boundary Restoration (D1)

**Date:** 2026-04-22
**Branch:** main (working-tree-only — not yet merged)
**Plan:** `docs/superpowers/plans/2026-04-22-phase-78-100b-remediation.md` (Phase 2)

## What changed

1. **Single sanctioned service-role factory.** `src/lib/supabase/admin.ts` is now
   the only module in the codebase that constructs a service-role Supabase
   client. Exposes `getSupabaseAdmin()` (cached) and the test helper
   `__resetAdminClientForTests()`. A new `isSupabaseAdminAvailable()` helper lets
   callers probe without naming `SUPABASE_SERVICE_ROLE_KEY` directly (which the
   scope test flags as suspicious when combined with a `createClient(` call).

2. **Scope enforcement test.** `__tests__/security/supabase-admin-scope.test.ts`
   statically walks `src/`, `scripts/`, `tests/` and fails CI if:
   - Any file outside the allow-list imports `@/lib/supabase/admin`, OR
   - Any file outside `src/lib/supabase/admin.ts` both references
     `SUPABASE_SERVICE_ROLE_KEY` AND calls `createClient(` / `createSupabaseJsClient(`.

3. **Offenders refactored.** Four call-sites that previously constructed a
   service-role client inline have been converted to use the sanctioned
   factory:
   - `src/app/api/auth/signup/route.ts`
   - `src/app/api/auth/google/callback/route.ts`
   - `src/lib/db/queries.ts` (the universal `getDb()` admin wrapper — kept
     working by switching its import from the removed `createServerClient`
     helper to `getSupabaseAdmin`)
   - `src/lib/workflows/scheduler.ts` (module-level construction converted to
     a lazy `Proxy` that defers to `getSupabaseAdmin()` on first property
     access so importing the module in tests no longer crashes)

4. **Footgun removed.** `src/lib/db/client.ts::createServerClient` — which
   silently fell back to the anon key when the service role was absent — was
   deleted. Its single consumer (`brain-migration.ts`) now imports
   `getSupabaseAdmin` directly.

## Verification (all commands rerun immediately before committing)

### tsc --noEmit (with raised heap)
```
EXIT=0
(no output — clean)
```
Note: the default heap size OOMs while type-checking this project. Run with
`NODE_OPTIONS="--max-old-space-size=6144" npx tsc --noEmit`.

### scope test only
```
__tests__/security/supabase-admin-scope.test.ts (2 tests)
  ✓ is imported only from explicitly allowed paths
  ✓ no other file constructs a service-role Supabase client directly
Test Files  1 passed (1)
Tests       2 passed (2)
```

### full vitest run
```
Test Files  365 passed (365)
Tests       2734 passed (2734)
Duration    ~38s
EXIT=0
```
(Baseline was 364 files / 2732 tests — +1 file / +2 tests from the new scope
test. No regressions.)

## Test fix

`__tests__/verification-invite-welcome-crons.test.ts` previously relied on the
removed anon-fallback behavior. Updated to set `SUPABASE_SERVICE_ROLE_KEY` in
the three cases where the cron/admin route legitimately needs it. The old
passing behavior was exactly the D1 footgun this phase removes — the test
fix makes the admin requirement explicit.

## What this does NOT yet fix

`getDb()` is still the universal DB accessor used across user-facing handlers
and server actions. It STILL returns an admin client that bypasses RLS — but
that construction is now audited, allow-listed, and documented via JSDoc on
`queries.ts`. Phase 8 (RLS audit) will split this into `getDbAdmin()` (cron,
webhooks, migrations) and `getDbAuthed()` (cookie-bound per-request client).
