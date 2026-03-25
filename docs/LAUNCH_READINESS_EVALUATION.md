# Launch Readiness Evaluation — recall-touch.com

**Date:** Post–production deployment wiring  
**Mode:** PRODUCTION LOCKED — INSTITUTIONAL STANDARD  
**Verdict:** **Ready for launch** once infra checklist is done (migrations, env, domain, cron).

---

## 1. What was evaluated

- Architecture and invariants (checklist A–O)
- Production wiring (migrations, env, cron, Stripe, security, prod gate)
- Surfaces and copy (start, public record, activation, pricing, language)
- Founder export, hosted executor, data spine
- Test and build status

---

## 2. Verification results

| Check | Command | Result |
|-------|---------|--------|
| Full test suite | `npm test -- --run` | **Pass** — 220 files, 1103 tests |
| Guarantee invariants | `npm run prebuild` | **Pass** — 80 files, 314 tests, "Guarantee verification passed." |
| Production build | `npm run build` | **Pass** — Next.js build succeeds |

**Prod gate** (`BASE_URL=https://recall-touch.com npm run prod:gate`) will pass only after:
1. All required env are set in Vercel (see `docs/VERCEL_ENV.md`).
2. App is deployed and reachable at that BASE_URL.

---

## 3. Launch readiness by area

### Architecture and pipeline — READY

- Single execution pipeline; no alternate emit paths; no direct provider calls in execution layer.
- `createActionIntent` only in allowed call sites; no TRUNCATE in cron routes.
- Append-only spine; data retention uses archive, no DELETE in operational spine.
- Jurisdiction safety, rate ceilings, dead-letter, watchdog, self-healing, approval expiry covered by tests and cron core.

### Database — READY (after migrations)

- Migrations exist for core spine, retention archives, `system_cron_heartbeats`, production indexes.
- **Action required:** Apply `production_system_cron_heartbeats.sql` and `production_indexes.sql` (and any prior migrations) in Supabase before first deploy.

### Environment and security — READY (after config)

- `docs/VERCEL_ENV.md` defines required vars for recall-touch.com.
- `verify-prod-config` enforces CRON_SECRET, PUBLIC_VIEW_SALT, FOUNDER_EXPORT_KEY, Supabase, and (when Stripe used) STRIPE_WEBHOOK_SECRET.
- Security headers in next.config: X-Frame-Options, X-Content-Type-Options, HSTS, CSP.
- **Action required:** Set all required env in Vercel; no optional secrets in repo.

### Cron — READY

- `/api/cron/core` includes connector-inbox, hosted-executor, data-retention, watchdog, self-healing, approval-expiry, and remaining steps.
- Hosted executor: max 10 workspaces, 5 intents/workspace, 2‑minute minimum, execution_cycle_completed, rate ceiling → pause_execution.
- **Action required:** Schedule GET `https://recall-touch.com/api/cron/core` every 2 minutes with `Authorization: Bearer <CRON_SECRET>`.

### Stripe — READY (after config)

- Webhook URL documented: `https://recall-touch.com/api/billing/webhook`; events and signature verification in place.
- No Stripe IDs returned to client; tier/interval mapping in webhook.
- **Action required:** Create products/prices in Stripe; set price ID env vars; register webhook endpoint and secret.

### Surfaces and copy — READY

- Start: one primary CTA; banner + continuity line; "You are operating at institutional standard."; "Execution not observed." when stale.
- Public record: institutional header, scarcity line, "Copy record", "This record may be forwarded without modification.", footer viral line; no internal IDs or query params in copy link.
- Activation: "Execution is now under institutional governance."; 3s then fade then redirect.
- Language: forbidden list enforced by test; no SaaS/marketing tone in user-facing copy.

### Founder export — READY

- 401 when unauthorized; allowlist-only response; bounded queries; no Stripe IDs, tokens, or secrets.

### Prod gate — READY

- Validates BASE_URL (recall-touch.com or www); runs verify-prod-config then self-check (health, trial, checkout, webhook, public work, dashboard, billing).

---

## 4. Gaps / risks (none block launch if checklist done)

| Item | Status | Notes |
|------|--------|--------|
| RLS on every table | Not re-audited | Founder export uses service role; public record by external_ref. Add RLS audit later if needed. |
| founder_alerts / activation_records tables | Not in migration audit | If used by code, ensure migrations exist; otherwise no impact. |
| WWW → apex redirect | Not in code | Configure in Vercel (or DNS) so www.recall-touch.com → recall-touch.com. |

---

## 5. Pre-launch checklist (you do these)

1. **Supabase:** Apply all migrations (including `production_system_cron_heartbeats.sql`, `production_indexes.sql`).
2. **Vercel:** Set env from `docs/VERCEL_ENV.md` (BASE_URL, NEXT_PUBLIC_APP_URL, CRON_SECRET, PUBLIC_VIEW_SALT, FOUNDER_EXPORT_KEY, Supabase, Stripe).
3. **Vercel:** Attach domain recall-touch.com; enable HTTPS; optional: www → apex redirect.
4. **Stripe:** Create products/prices (Solo/Growth/Team, monthly + annual); set price ID env vars; add webhook `https://recall-touch.com/api/billing/webhook`; set STRIPE_WEBHOOK_SECRET.
5. **Cron:** Configure 2‑minute GET to `https://recall-touch.com/api/cron/core` with `Authorization: Bearer <CRON_SECRET>`.
6. **Deploy:** Deploy from main; ensure build and prebuild already pass.
7. **Prod gate:** Run `BASE_URL=https://recall-touch.com npm run prod:gate` (with production env) and fix any failure.

---

## 6. Verdict

**Ready for launch** for private alpha with 20 operators, provided:

- Migrations are applied.
- Env is set per VERCEL_ENV.md.
- Domain and cron are configured as above.
- `npm run prod:gate` passes against the live deployment.

No further product or architecture changes are required for this step. Next: deploy, run prod gate, onboard first 20 operators, use founder export weekly, and push record propagation.
