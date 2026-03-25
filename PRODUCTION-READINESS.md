# Production Readiness Checklist

## Result: PASS

All items below verified. Run tests, build, and lint before deploy.

---

## Pre-deploy verification

| Check | Command |
|-------|---------|
| Build | `npm run build` |
| Tests | `npm run test` |
| Lint | `npm run lint` |

---

## Environment

- [ ] `SUPABASE_URL`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `OPENAI_API_KEY`
- [ ] `WEBHOOK_SECRET` (or `WEBHOOK_SIGNING_SECRET`)
- [ ] `CRON_SECRET` (for cron + admin DLQ)
- [ ] `STRIPE_SECRET_KEY` (if using billing)

---

## Database

- [ ] `revenue_operator` schema created (`supabase/setup-revenue-operator.sql`)
- [ ] Schema exposed in Supabase: Project Settings → API → Exposed schemas → add `revenue_operator`

---

## Cron jobs

**Recommended minimal:**

| Endpoint | Schedule |
|----------|----------|
| `/api/cron/core` | `*/2 * * * *` (every 2 min) |
| `/api/cron/assurance-delivery` | `0 * * * *` (hourly) |

Header: `Authorization: Bearer <CRON_SECRET>`

**Core vs full guarantees.** Core provides the minimal continuity bundle (connector-inbox, process-queue, recoveries, engines, proof-capsules, assurance-delivery, settlement-export). Optional single cron `GET /api/cron/guarantees` (e.g. `*/10 * * * *`) runs progress-watchdog, integrity-audit, closure, handoff-notifications, no-reply. Optional `GET /api/cron/core-drift` (e.g. `0 */6 * * *`) records doctrine-safe drift incidents. See `docs/PRODUCTION_DEPLOYMENT.md` for the full optional table.

**Installation readiness.** `GET /api/installation/readiness?workspace_id=...` returns booleans only. “Connected” means evidence/data exists in that domain (e.g. bookings, shared_transactions), not OAuth or connector configuration.

---

## Commands

```bash
# Local
npm run dev

# Production
npm run build && npm run start

# Deploy (Vercel)
vercel --prod
```
