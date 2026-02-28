# Launch Quality Report

Final polish and "200% works" launch hardening. Doctrine + determinism + safety.

**Status: PRODUCTION LOCKED — INSTITUTIONAL STANDARD.** Architecture frozen. No new backend layers. Institutional tone. Record authority and operator identity elevated. Launch sequence: deploy → prod gate → first 20 operators → record propagation → founder export weekly → scale distribution.

---

## Commercial Execution Infrastructure — Guarantees (latest)

- **Single canonical pipeline:** `compileGovernedMessage` only in execution-plan/build and message preview routes. `createActionIntent` only in execution-plan/emit, enterprise approvals, voice outcome, check-in-email (intent), and action-intents. No API route calls delivery provider.
- **Approval immutability:** Approve route returns `{ ok: true, idempotent: true }` when status already decided; no double intent emission.
- **Connector safety:** Ingest append-only; execution only when `normalized_inbound` has conversation_id, thread_id, work_unit_id, intent_hint; invalid shape returns `execution: { ok: false, reason: "invalid_normalized_inbound" }`.
- **Voice outcome compliance:** When plan required consent or disclosures, outcome rejected with `{ ok: false, reason: "compliance_violation" }`; action intent not completed.
- **Determinism lock:** No Math.random or crypto.randomUUID in strategy-engine, execution-plan, compiler, emit, voice plan builder.
- **Action intent integrity:** dedupe_key unique; claim uses claimed_at IS NULL; 23505 handled; no deletes.
- **API contract:** Routes return status 200 with `ok` boolean; no stack trace or internal IDs.
- **Build:** Fails if any invariant test fails (prebuild runs verify-guarantees).

---

## What changed (this pass)

1. **Self-check** — Expanded to 10 steps: system health, trial start, activate + pricing load, billing checkout contract, webhook (no redirect), onboarding thread, public work GET, public work respond, core status, dashboard load, dashboard billing. Single-read body helper used; any failure prints one line and exits non-zero.
2. **Billing contracts** — Trial/checkout return deterministic `{ ok, reason? | checkout_url? }`. Allowed reasons locked. Webhook uses raw body and signature; idempotent on duplicate event (23505). Tests: `billing_contracts.test.ts`, `middleware_public_api.test.ts`.
3. **Middleware** — Billing webhook and `/api/system/health` in public API allowlist; API POST never redirected; protected API returns 401 when no session.
4. **Governance** — Tests: `governance_no_bypass.test.ts` (message policy, compliance pack, disclaimers, forbidden phrase, approval_required, preview_required, jurisdiction).
5. **Domain packs** — All industry packs have ≥15 strategy states. New states: authority_check, timeline_check, financial_alignment, offer_positioning, compliance_disclosure, follow_up_scheduled, confirmation_pending. Tests: depth, objection integrity, regulatory required fields.
6. **Voice** — `src/lib/voice/call-script-blocks.ts` presets for real_estate, insurance, solar, legal. place_outbound_call payload includes script_blocks, consent nodes, disclosure lines.
7. **Action intents** — Concurrency and safety tests: claim atomicity, dedupe_key unique, 23505 handling.
8. **Connector** — CSV import contract test: ingest uses workspace_id, channel, external_id; idempotent; no direct send.
9. **Pricing copy** — Solo/Growth/Team/Enterprise and annual note aligned with spec. No channels/packs/seats language.
10. **Onboard** — "Domain pack" → "Domain" in onboard domain page.
11. **Docs** — `PRICING_STRIPE_SETUP.md`, `ENTERPRISE_GOVERNANCE.md`, `DOMAIN_PACKS.md`, this report.

---

## How to verify

### 1. Tests (must be 100% green)

```bash
npm test -- --run
```

Expected: All test files pass. No skipped or failing tests.

### 2. Prebuild (guarantee invariants)

```bash
npm run prebuild
```

Expected: `Guarantee verification passed.` Exit code 0.

### 3. Build

```bash
npm run build
```

Expected: Next.js build completes. No build errors.

### 4. Production gate (with BASE_URL set)

```bash
BASE_URL=https://your-deployment-url.com npm run prod:gate
```

Expected:

- `verify-prod-config` passes (all required env vars set; missing vars print one line each and exit 1).
- `self-check` runs 10 steps; each prints `[self-check] N. ... ok` and finally `All steps passed.`
- If any step fails: one line to stderr and exit 1.

### recall-touch.com launch checklist

- **DNS:** Point recall-touch.com to deployment target.

- **Env (required):**
  - `NEXT_PUBLIC_APP_URL=https://recall-touch.com`
  - `BASE_URL=https://recall-touch.com`
  - `CRON_SECRET` — for cron route authorization
  - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — as already used by the app
  - Stripe keys — only where billing is used (see existing billing setup)
  - `PUBLIC_VIEW_SALT` — required for public record view hashing
  - `FOUNDER_EXPORT_KEY` — for founder export and scenario incident ingest fallback
  - `SCENARIO_INGEST_KEY` — optional; preferred for scenario incident ingest when set

- **Migrations:** Apply all migrations in `supabase/migrations` in order.

- **Cron schedule:**
  - `/api/cron/core` — every 2 minutes
  - `/api/cron/hosted-executor` — only if not invoked from core; otherwise document that it is covered by core
  - `/api/cron/data-retention` — per data retention policy

- **Gate command:**
  - `BASE_URL=https://recall-touch.com npm run prod:gate`

---

### 5. Expected self-check output (success)

```
[self-check] BASE_URL: https://...
[self-check] Resolved base: https://...
[self-check] 1. Trial start: ok
[self-check] 2. Activate + pricing load: ok
[self-check] 3. Billing checkout contract: ok
[self-check] 4. Webhook (no redirect, deterministic): ok
[self-check] 5. Onboarding thread creation: ok  (or "no workspace or error")
[self-check] 6. Public work GET: ok
[self-check] 7. Public work respond: ok
[self-check] 8. Core status: ok
[self-check] 9. Dashboard load: ok
[self-check] 10. Dashboard billing: ok
[self-check] All steps passed.
```

---

## Rollback path

- Revert this PR. Prebuild and tests will revert to prior state.
- No schema changes in this pass; no migration rollback required.
- Env vars unchanged; Stripe price IDs and webhook URL remain as configured.

---

## Final checklist

| Item | Status |
|------|--------|
| `npm test` 100% green | Run and confirm |
| `npm run build` green | Run and confirm |
| `npm run prebuild` green | Run and confirm |
| `npm run prod:gate` succeeds with correct BASE_URL | Run against staging/prod |
| Pricing/Stripe mapping validated | Env vars set per PRICING_STRIPE_SETUP.md |
| Domain pack depth tests enforced (≥15 states) | domain_pack_depth_enforcement.test.ts |
| Voice script integrity tests enforced | voice_script_chain_integrity, voice_escalation_threshold, voice_compliance_block_required |
| Governance enforcement tests enforced | governance_no_bypass.test.ts |
| Billing contracts and middleware tests | billing_contracts.test.ts, middleware_public_api.test.ts |
| Connector and action intent tests | connector_csv_contract.test.ts, action_intent_concurrency.test.ts |
| Enterprise immutability lock enforced | enterprise_immutability.test.ts, enterprise approvals routes |
| Final lock invariants enforced | commercial_execution_final_lock.test.ts in verify-guarantees.ts |

## Enterprise readiness + prod gate

- **Enterprise:** Dual approval chain, compliance locks, and fail-fast activation are enforced. Audit export is bounded (ORDER BY + LIMIT). See `docs/FINAL_LOCK_CHECKLIST.md`.
- **Prod gate command:** `BASE_URL=https://your-deployment-url.com npm run prod:gate`
- **Expected:** verify-prod-config passes (all required env vars set); self-check runs and prints `[self-check] N. ... ok` for each step; final line `All steps passed.` Exit 0. If BASE_URL is missing or any step fails, exit 1.
- **Cron schedule:** Call `/api/cron/core` at the documented interval (e.g. every 2 minutes). Core runs connector-inbox, action-intent-watchdog, self-healing, approval-expiry, and remaining engines.
- **Stripe env vars:** STRIPE_SECRET_KEY, STRIPE_PRICE_ID (or per-tier price IDs), STRIPE_WEBHOOK_SECRET, NEXT_PUBLIC_APP_URL. See docs/VERCEL_ENV.md and pricing docs.

---

**Canonical doctrine:** `docs/RECALL_TOUCH_DOCTRINE.md`, `docs/SYSTEM_SPEC.md`
