# Launch Now — recall-touch.com

What to do, in order. Migrations are already applied.

---

## 1. Set environment variables (Vercel Production)

In **Vercel → Project → Settings → Environment Variables** (Production), set:

| Variable | Required | Notes |
|--------|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key |
| `SESSION_SECRET` or `ENCRYPTION_KEY` | Yes | 32+ chars, random |
| `CRON_SECRET` | Yes | 32+ chars, for cron route auth |
| `NEXT_PUBLIC_APP_URL` | Yes | `https://recall-touch.com` |
| `PUBLIC_VIEW_SALT` | Yes | For public record hashing |
| `FOUNDER_EXPORT_KEY` | Yes | For founder export / scenario ingest |
| `BASE_URL` | For prod:gate only | Same as `NEXT_PUBLIC_APP_URL` when running gate locally |

**If billing is enabled:**

| Variable | Notes |
|--------|--------|
| `STRIPE_SECRET_KEY` | Stripe Dashboard → API keys |
| `STRIPE_WEBHOOK_SECRET` | From Stripe webhook for your domain |
| `STRIPE_PRICE_SOLO_MONTH` | From .env.example or Stripe Prices |
| `STRIPE_PRICE_SOLO_YEAR` | Same |
| (optional) `STRIPE_PRICE_GROWTH_*`, `STRIPE_PRICE_TEAM_*` | If using those tiers |

**Optional:** `SCENARIO_INGEST_KEY` (for scenario incident API); email/SMS/Zoom vars if those features are used.

---

## 2. DNS

Point **recall-touch.com** (and optionally **www.recall-touch.com**) to your Vercel deployment (Vercel will show the target, e.g. cname or A record).

---

## 3. Stripe webhook (if billing enabled)

1. Stripe Dashboard → Developers → Webhooks → Add endpoint.
2. URL: `https://recall-touch.com/api/billing/webhook`
3. Events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
4. Copy signing secret → Vercel env `STRIPE_WEBHOOK_SECRET`

---

## 4. Cron jobs (Vercel Cron or external)

- **`/api/cron/core`** — every 2 minutes (`*/2 * * * *`)
- **`/api/cron/hosted-executor`** — only if not invoked by core (or same schedule)
- **`/api/cron/data-retention`** — per your retention policy

Use **Vercel → Project → Settings → Cron Jobs** or an external cron (with `CRON_SECRET` in the request header).

---

## 5. Deploy

```bash
vercel --prod
```

Confirm build succeeds in Vercel.

---

## 6. Prod gate (before calling “launched”)

From your machine (with env vars loaded or Vercel envs set for the project):

```bash
BASE_URL=https://recall-touch.com npm run prod:gate
```

- Runs `verify-prod-config` (required env vars) then `self-check` (10 steps against live URL).
- Must exit 0 and print `All steps passed.`
- If it fails, fix the reported missing vars or failing step before launch.

---

## 7. Post-deploy (optional but recommended)

- **Seed domain packs / templates** (idempotent):  
  `npx tsx scripts/seed-domain-packs.ts`  
  (Run once with prod env; or ensure global templates/policies exist in DB.)
- **Smoke test** (if you have a smoke script):  
  `BASE_URL=https://recall-touch.com CRON_SECRET=... npm run smoke`
- Manually: hit `/activate`, start trial, complete checkout with test card `4242 4242 4242 4242`, then check dashboard and public record.

---

## 8. Done

- **Migrations:** Already applied (158/158).
- **Tests:** Run `npm test`, `npm run prebuild`, `npm run build` locally; all must pass.
- **Launch sequence:** Deploy → prod gate → first 20 operators → record propagation → founder export weekly.

Canonical docs: `LAUNCH_QUALITY_REPORT.md`, `LAUNCH_CHECK.md`, `FINAL_LOCK_CHECKLIST.md`.
