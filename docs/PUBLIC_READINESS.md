# Ready for Public Use — Checklist

What must be done for the app to be **ready for public use and 100% working**.

---

## 1. Infrastructure (Do First)

### 1.1 Vercel project

- [ ] Create (or use existing) Vercel project linked to this repo
- [ ] Deploy at least once: `vercel --prod` (can fail until env is set; that’s OK)
- [ ] Set **Production** (and optionally Preview) domain, e.g. `https://your-app.vercel.app` or custom domain

### 1.2 Supabase project

- [ ] Create (or use existing) Supabase project
- [ ] Apply **all** migrations in `supabase/migrations/` in order (e.g. `supabase db push` or run each in SQL Editor)
- [ ] Confirm key tables exist (see `SUPABASE_PROD_CHECKLIST.md`)
- [ ] Copy from Supabase Dashboard:
  - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
  - anon key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - service_role key → `SUPABASE_SERVICE_ROLE_KEY`

### 1.3 Environment variables in Vercel

Set in **Vercel → Project → Settings → Environment Variables** for **Production** (and Preview if you use it).

**Required (app will not work without these):**

| Variable | Where to get it |
|----------|------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API |
| `CRON_SECRET` | Generate: e.g. `openssl rand -base64 32` |
| `SESSION_SECRET` or `ENCRYPTION_KEY` | Generate: e.g. `openssl rand -base64 32` (min 32 bytes) |
| `NEXT_PUBLIC_APP_URL` | Your live URL, e.g. `https://your-app.vercel.app` |

**Required for trial/checkout (billing):**

| Variable | Where to get it |
|----------|------------------|
| `STRIPE_SECRET_KEY` | Stripe Dashboard → Developers → API keys → Secret key |
| `STRIPE_PRICE_ID` | Stripe → Products → [Your product] → Price ID (must be **recurring** subscription) |
| `STRIPE_WEBHOOK_SECRET` | After creating webhook in step 1.5 |

**Optional (enable when you need the feature):**

- Email: `RESEND_API_KEY`, `EMAIL_FROM`
- SMS: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
- Zoom: `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET`, `ZOOM_WEBHOOK_SECRET`, `ZOOM_REDIRECT_URL`

- [ ] Redeploy after setting env vars

### 1.4 Cron jobs

The app expects a **core cron** to run regularly so queues and recovery run.

**Option A — Vercel Cron (recommended)**  
Update `vercel.json` so the **core** cron is defined and runs every 2 minutes:

```json
{
  "crons": [
    { "path": "/api/cron/core", "schedule": "*/2 * * * *" },
    { "path": "/api/cron/assurance-delivery", "schedule": "0 * * * *" }
  ]
}
```

Ensure `CRON_SECRET` is set in Vercel; Vercel Cron will send it as `Authorization: Bearer <CRON_SECRET>`.

**Option B — External cron**  
Call every 2 minutes:

- `GET https://<YOUR_DOMAIN>/api/cron/core`
- Header: `Authorization: Bearer <CRON_SECRET>`

- [ ] Confirm cron is configured (see `CRON_PROD.md` for full list)
- [ ] After first run, check Supabase: `cron_heartbeats` (or equivalent) should show recent `core` runs

### 1.5 Stripe webhook (required for billing to “100% work”)

- [ ] Stripe Dashboard → Developers → Webhooks → Add endpoint
- [ ] URL: `https://<YOUR_DOMAIN>/api/billing/webhook`
- [ ] Events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
- [ ] Copy **Signing secret** → set in Vercel as `STRIPE_WEBHOOK_SECRET`
- [ ] Redeploy, then in Stripe send a test webhook and confirm 200 response

---

## 2. Stripe: Test vs Live

- **Test mode (development):** Use Stripe **test** keys and test card `4242 4242 4242 4242`. No real charges.
- **Live mode (public use):** In Stripe Dashboard switch to **Live**, use **live** API keys and `STRIPE_PRICE_ID` from a **live** recurring price. Set these in Vercel Production env.

For **100% work** in production with real signups:

- [ ] Stripe in **Live** mode
- [ ] Live `STRIPE_SECRET_KEY` and live `STRIPE_PRICE_ID` in Vercel Production
- [ ] Webhook endpoint uses your **production** URL and live signing secret in `STRIPE_WEBHOOK_SECRET`

---

## 3. Verify It Works (Post-Deploy)

Run these **after** deploy and env/cron/webhook setup.

### 3.1 Config check (optional script)

```bash
# If you added the script (see below)
npx tsx scripts/verify-prod-config.ts
```

Exits 0 only if all required env vars are set (no secret values printed).

### 3.2 Smoke test

```bash
BASE_URL=https://your-domain.com \
CRON_SECRET=your-cron-secret \
npm run smoke
```

- [ ] `/api/health` returns OK
- [ ] `/api/health/cron` shows `cron_secret_set: true` (and ideally recent success)

### 3.3 Trial flow (full path)

- [ ] Open `https://your-domain.com/activate`
- [ ] Enter email, click “Start protection”
- [ ] Redirects to Stripe Checkout
- [ ] Pay with test card (test mode) or real card (live)
- [ ] Redirects back to app (e.g. `/connect` or dashboard)
- [ ] Same email again → should get `ok: true, reason: "already_active"` (no duplicate workspace)

### 3.4 Onboarding flow

- [ ] Open `https://your-domain.com/onboard`
- [ ] Complete: identity → source → record → send → waiting → complete
- [ ] Record shows orientation lines; can add another outcome on complete page

### 3.5 Dashboard

- [ ] `/dashboard` — Situation (empty state if no data)
- [ ] `/dashboard/record` — Record
- [ ] `/dashboard/activity` — Activity
- [ ] `/dashboard/presence` — Presence

---

## 4. Optional: Script and npm Alias

- Add an npm script so you can run the prod-config check easily. In `package.json`:

```json
"verify:prod-config": "tsx scripts/verify-prod-config.ts"
```

Then: `npm run verify:prod-config`.

---

## 5. Summary: Minimum for “100% work” for public

1. **Vercel** — Project + deploy + `NEXT_PUBLIC_APP_URL` and domain.
2. **Supabase** — Project + all migrations applied + three env vars in Vercel.
3. **Vercel env** — All **required** vars set (including `CRON_SECRET`, `SESSION_SECRET` or `ENCRYPTION_KEY`).
4. **Stripe (billing)** — Live keys + live `STRIPE_PRICE_ID` + webhook to `/api/billing/webhook` + `STRIPE_WEBHOOK_SECRET` in Vercel.
5. **Cron** — `/api/cron/core` running every 2 minutes with `CRON_SECRET`.
6. **Smoke + manual checks** — Health, trial flow, onboarding, dashboard all pass.

After that, the app is ready for public use and the critical paths (trial, checkout, onboarding, dashboard) can work 100%.
