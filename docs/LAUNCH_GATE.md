# Launch Gate Checklist

Final verification before declaring production launch-ready.

## Environment Variables

- [ ] `NEXT_PUBLIC_SUPABASE_URL` set
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` set
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set
- [ ] `CRON_SECRET` set
- [ ] `SESSION_SECRET` or `ENCRYPTION_KEY` set
- [ ] `NEXT_PUBLIC_APP_URL` set to production domain
- [ ] Conditional vars set (Stripe, Twilio, Zoom, Resend if enabled)

**Verification:** Run `npm run verify:env` - all required vars present

## Database Migrations

- [ ] All migrations in `supabase/migrations/` applied
- [ ] All required tables exist (see `SUPABASE_PROD_CHECKLIST.md`)
- [ ] All critical indexes exist
- [ ] Unique constraints enforced
- [ ] Foreign keys enforced

**Verification:** Run queries from `SUPABASE_PROD_CHECKLIST.md` - all succeed

## Cron Configuration

- [ ] Core cron scheduled (`*/2 * * * *`)
- [ ] Assurance delivery cron scheduled (`0 * * * *`)
- [ ] Optional crons configured (guarantees, core-drift, temporal-stability, proof-capsules)
- [ ] `CRON_SECRET` matches value in cron caller
- [ ] Cron heartbeats updating

**Verification:** Check `cron_heartbeats` table - `core` job updated within last 5 minutes

## Public Endpoints Rate Limited + Neutral Response

- [ ] `/api/public/work/[external_ref]` rate limited
- [ ] `/api/public/work/[external_ref]/respond` rate limited
- [ ] Rate limit returns neutral response (not error)
- [ ] Over limit returns neutral response (not 429 with details)

**Verification:** Call endpoint repeatedly - returns neutral response when over limit

## requireWorkspaceAccess Enforced When SESSION_ENABLED

- [ ] `SESSION_ENABLED=true` or `SESSION_SECRET` set
- [ ] `/api/operational/*` endpoints require auth
- [ ] `/api/system/core-status` requires workspace access
- [ ] Missing auth returns 401 (not 500)

**Verification:** Call endpoint without auth - returns 401

## Core Status Shows Heartbeats After Cron Runs

- [ ] `/api/system/core-status` returns `inbound_processing_active: true` after cron runs
- [ ] `/api/system/core-status` returns `queue_processing_active: true` after cron runs
- [ ] `/api/system/core-status` returns `assurance_attempted_recently: true` after assurance cron runs

**Verification:** Wait 5 minutes, call core-status - heartbeats show true

## Onboarding Creates Thread and Reaches Acknowledgement

- [ ] POST `/api/onboard/identity` creates workspace
- [ ] POST `/api/onboard/create-thread` creates thread
- [ ] Thread has `external_ref` and `state = "pending_acknowledgement"`
- [ ] POST `/api/public/work/[external_ref]/respond` with `type: "confirm"` acknowledges thread
- [ ] Thread state changes to `"acknowledged"`

**Verification:** Run smoke test - onboarding flow completes

## Public Respond Works for Counterparty and Downstream Role

- [ ] POST `/api/public/work/[external_ref]/respond` with `actor_role: "counterparty"` works
- [ ] POST `/api/public/work/[external_ref]/respond` with `actor_role: "downstream"` works
- [ ] POST `/api/public/work/[external_ref]/respond` with `actor_role: "observer"` works
- [ ] Actions recorded in `reciprocal_events` table

**Verification:** Call respond endpoint with different roles - all succeed

## Responsibilities Create/Resolve Without Blocking

- [ ] Creating thread with responsibility creates `operational_responsibilities` row
- [ ] Reciprocal event resolves responsibility
- [ ] No blocking or deadlocks
- [ ] Multiple responsibilities can exist per thread

**Verification:** Create thread, trigger event - responsibility resolves

## Export Record Returns Deterministic Structure

- [ ] GET `/api/operational/export-record` returns valid JSON
- [ ] Response has `orientation`, `continuation`, `responsibilities`, `amendments`, `proof` keys
- [ ] All arrays are arrays (not null/undefined)
- [ ] No internal IDs in response (only `external_ref` or `thread_ref`)
- [ ] Response is deterministic (same input = same output)

**Verification:** Call export-record twice - identical response

## Settlement Gating Unchanged (No Shortcuts)

- [ ] Settlement endpoints require valid subscription
- [ ] Trial workspaces have `billing_status: "trial"`
- [ ] Expired subscriptions block settlement operations
- [ ] No bypass mechanisms

**Verification:** Check settlement endpoints - require valid subscription

## Doctrine Compliance

- [ ] No forbidden words in API responses (should, improve, increase, performance, optimize, recommend, advice, suggest, better, faster, efficient)
- [ ] All statements ≤90 characters
- [ ] No internal IDs exposed in public endpoints
- [ ] No metrics or percentages in user-facing text

**Verification:** Run smoke test - doctrine checks pass

## Smoke Test Passes

- [ ] All smoke test assertions pass
- [ ] No errors in smoke test output
- [ ] All endpoints return expected response shapes

**Verification:** Run `scripts/prod-smoke-test.ts` - exits with code 0

## Final Checks

- [ ] Build passes: `npm run build`
- [ ] Tests pass: `npm test` (acceptable if 1-2 non-critical tests fail)
- [ ] No localhost URLs in production code
- [ ] Middleware allows onboarding/public routes
- [ ] No secrets logged in production

## Launch Declaration

**Only check this box after ALL above boxes are checked:**

- [ ] **LAUNCH READY** - All checks passed, system is production-ready

## Post-Launch Monitoring

After launch, monitor:

- [ ] Cron heartbeats updating regularly
- [ ] No 500 errors in logs
- [ ] Public endpoints accessible
- [ ] Database queries performing well
- [ ] Rate limits preventing abuse

## Rollback Plan

If issues discovered post-launch:

1. Identify failing component
2. Check logs for error details
3. Fix issue or rollback deployment
4. Update this checklist with learnings
5. Re-run verification before re-launch

---

**Last Verified:** _______________

**Verified By:** _______________

**Deployment URL:** _______________
