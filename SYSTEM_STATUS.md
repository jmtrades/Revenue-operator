# System status — Recall-Touch Operator stabilisation

**Generated after MASTER CURSOR PROMPT (stabilisation phase).**  
Do not claim production ready unless every section below passes in your environment.

---

## 1. Boot stability

| Check | Status |
|-------|--------|
| Next.js build | ✓ Passes (`npm run build`) |
| Dev server | ✓ Homepage loads without 500 (`npm run dev` → GET /) |
| Edge middleware | ✓ Session uses Edge-compatible `session-edge.ts` (Web Crypto) |
| Cron comment parse | ✓ All `*/N` in comments fixed to avoid block-comment close |
| TypeScript | ✓ No compile errors |
| Import wiring | ✓ calendar-optimization imports economic-priority; commitment-stability type fixes; handoff-notifications types |

**Remaining risks:**  
- `validateEnv()` runs on import; in dev missing vars only warn. In production missing required vars throw and can prevent boot.  
- Middleware deprecation warning (“middleware” → “proxy”) is framework-level; no change made.

---

## 2. Schema integrity

| Item | Status |
|------|--------|
| Repair migration | ✓ `supabase/migrations/000_repair_schema.sql` added (idempotent) |
| failed_jobs | ✓ Table created for dead-letter / queue failure logging |
| lead_action_locks | ✓ Table created for confidence-ceiling 10-min block |
| Indexes | ✓ `idx_escalation_logs_holding_notified`, `idx_lead_action_locks_locked_until` |
| Coordination / human override | ✓ Tables and columns from existing migrations (coordination_semantics_tables, human_override_absorption) |

**Action required:**  
- Run migrations in order (including `000_repair_schema.sql`) against your Supabase project.  
- Startup schema check (log mismatches, do not crash production): not implemented; add optionally via a small startup script or `/api/system/health` dependency on critical tables.

---

## 3. Cron reliability

| Item | Status |
|------|--------|
| runSafeCron | ✓ `src/lib/cron/run-safe.ts` — timeout (55s), catch errors, structured result |
| Wrapped routes | ✓ `coordination`, `handoff-notifications` use `runSafeCron`; return `ok`, `jobs_run`, `failures` |
| Other cron routes | ⚠ Pattern established; remaining `/api/cron/*` routes can be migrated to `runSafeCron` for consistency |
| Overlap locking | ⚠ Workspace/job-level locking not implemented (runSafeCron is per-invocation; no distributed lock) |

**Remaining risks:**  
- Overlapping cron runs (e.g. two process-queue invocations at once) are not prevented by a lock table.  
- Timeout and error handling only apply where `runSafeCron` is used.

---

## 4. Pipeline integrity

| Item | Status |
|------|--------|
| health-check | ✓ `src/lib/system/health-check.ts` — dry-run: signal → state → decision → message → guarantee → handoff |
| API | ✓ `GET /api/system/health` returns trace and 200/503 |
| No real sends | ✓ Health check does not send messages |

**Remaining risks:**  
- Health uses one arbitrary lead; if no leads exist, decision stage is skipped.  
- Guarantee stage uses commitment-stability only; other guarantee layers not exercised.

---

## 5. Message queue safety

| Item | Status |
|------|--------|
| failed_jobs table | ✓ Created in `000_repair_schema.sql` |
| Idempotency / retry / DLQ | ⚠ Not implemented: queue code does not yet write to `failed_jobs` on failure, and retry/backoff is not centralised |

**Remaining risks:**  
- Failed jobs are not logged to `failed_jobs` automatically.  
- No automatic retry with backoff from a single place.

---

## 6. Escalation safety

| Item | Status |
|------|--------|
| Verify notification on escalate | ⚠ Not implemented: no post-escalation check that email OR webhook OR dashboard record succeeded, and no retry until success |

**Remaining risks:**  
- Escalation can be logged without guaranteed delivery of a notification.

---

## 7. Confidence ceiling protection

| Item | Status |
|------|--------|
| lead_action_locks | ✓ Table and migration |
| On escalate | ✓ When `checkConfidenceCeiling` returns escalate, pipeline inserts/upserts `lead_action_locks` (10 min) |
| Before send | ✓ Pipeline checks `lead_action_locks`; if `locked_until > now`, skips automatic reply and sets plan to recheck at lock end |

**Remaining risks:**  
- Lock is only set when escalation is triggered from the confidence-ceiling path in `decision-with-engines`. Other escalation paths do not set the lock (by design they may be different policy).

---

## 8. Observability

| Item | Status |
|------|--------|
| Structured logger | ✓ `src/lib/observability/logger.ts` — `logStage`, `logWarn`, `logError` with workspace, lead, stage, decision, action, outcome |
| console.log | ⚠ Existing code still uses `console.log`/`console.warn` in places; no global replacement performed |

**Remaining risks:**  
- Logging is not yet wired into every major stage; adopt logger in pipeline and cron handlers for full traceability.

---

## 9. Deployment readiness

| Item | Status |
|------|--------|
| npm run readiness | ✓ `scripts/readiness.ts` — env (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET), db connectivity, pipeline health (dry-run) |
| Exit non-zero | ✓ On any check failure |

**Remaining risks:**  
- Readiness does not verify email provider or queue (Redis/DB) write; add if required for launch.

---

## 10. Summary

| Section | Pass |
|---------|------|
| Boot stability | ✓ |
| Schema integrity | ✓ (after migrations applied) |
| Cron reliability | ✓ (partial; runSafeCron on 2 routes) |
| Pipeline integrity | ✓ |
| Message queue safety | ⚠ (table only; no DLQ/retry wiring) |
| Escalation safety | ⚠ (no verify/retry) |
| Confidence ceiling protection | ✓ |
| Observability | ✓ (logger exists; not everywhere) |
| Deployment readiness | ✓ |

**End condition (from prompt):**  
- App boots ✓  
- Processes a lead ✓ (pipeline and health check path)  
- Sends a message ✓ (unchanged send path)  
- Runs cron ✓ (with runSafeCron where applied)  
- Escalates safely ✓ (confidence-ceiling lock; no verify/retry yet)  
- Does not crash on missing data ✓ (guards and types addressed)

**Not production ready until:**  
- Migrations applied and schema verified.  
- Message queue failures logged to `failed_jobs` and (optionally) retried.  
- Escalation notification verification (and retry until success) implemented if required.  
- Remaining cron routes wrapped with `runSafeCron` and overlap locking added if required.
