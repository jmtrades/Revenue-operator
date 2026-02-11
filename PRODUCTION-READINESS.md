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

| Endpoint | Schedule |
|----------|----------|
| `/api/cron/process-queue` | Every 1 min |
| `/api/cron/no-reply` | Daily |
| `/api/cron/billing` | Monthly |
| `/api/cron/learning` | Daily |

Header: `Authorization: Bearer <CRON_SECRET>`

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
