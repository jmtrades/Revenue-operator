# What’s next (migrations applied)

Migrations are done. Use this list to get the app fully live.

---

## 1. Supabase — Auth URLs

In **Supabase Dashboard** → **Authentication** → **URL configuration**:

- **Site URL:** `https://recall-touch.com` (or your production URL)
- **Redirect URLs** (add each):
  - `https://recall-touch.com/auth/callback`
  - `https://recall-touch.com/auth/callback?next=/dashboard`
  - `https://recall-touch.com/auth/callback?next=/dashboard/onboarding`
  - `https://recall-touch.com/sign-in`

For local dev, also add:

- `http://localhost:3000/auth/callback`
- `http://localhost:3000/auth/callback?next=/dashboard/onboarding`

---

## 2. Stripe

- **Webhook:** Add endpoint `https://recall-touch.com/api/billing/webhook`, copy the **Signing secret** (e.g. `whsec_...`), set as `STRIPE_WEBHOOK_SECRET` in Vercel (and `.env.local` for local testing).
- **Checkout:** App already uses success → `/connect`, cancel → `/activate?canceled=1`; no extra Stripe config needed for those.

---

## 3. Vercel (or your host)

Set these **environment variables** in the project:

| Variable | Required | Notes |
|----------|----------|--------|
| `SESSION_SECRET` | Yes | 32+ char secret for session cookies |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | From Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Same place |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Same place (keep secret) |
| `DATABASE_URL` | For migrations only | Postgres URI (migrations usually run locally) |
| `STRIPE_SECRET_KEY` | For billing | From Stripe Dashboard |
| `STRIPE_WEBHOOK_SECRET` | For webhooks | From Stripe Webhook signing secret |
| `NEXT_PUBLIC_APP_URL` or `BASE_URL` | Yes | e.g. `https://recall-touch.com` |
| `ADMIN_EMAIL` | For /admin | Only this email can access /admin |
| `CRON_SECRET` | For crons | Any secret; Vercel Cron calls use `Authorization: Bearer <CRON_SECRET>` |
| `RESEND_API_KEY` + `EMAIL_FROM` | Optional | For welcome/drip email |
| `VAPI_API_KEY` + `VAPI_PHONE_NUMBER_ID` | For voice | If using inbound/outbound calls |

**Vercel Cron:** `vercel.json` already defines:

- `/api/cron/core` (e.g. every 2 min)
- `/api/cron/speed-to-lead` (every minute)

Ensure **Vercel Cron** is enabled for the project; each request must send `Authorization: Bearer <CRON_SECRET>`.

---

## 4. Expose `revenue_operator` in Supabase

In **Supabase** → **Project Settings** → **API** → **Exposed schemas**, add `revenue_operator` so the API and RLS use it.

---

## 5. Smoke test (after deploy)

1. **Public:** Open `/`, `/activate`, `/pricing`, `/sign-in`, `/demo` — no spinner > 2s, no 5xx.
2. **Signup:** Submit `/activate`; check Supabase **Authentication** (and `signups` table if used).
3. **Auth:** Sign in (magic link or password); you should land on `/dashboard` or `/dashboard/onboarding`.
4. **Billing:** In dashboard go to Billing; “Manage billing” should open Stripe Customer Portal (if Stripe is configured).
5. **Webhook:** In Stripe Dashboard send a test event to your webhook URL; confirm no 5xx and that your handler runs (e.g. subscription created/updated).

---

## 6. Optional next steps

- **Resend:** Set `RESEND_API_KEY` and `EMAIL_FROM`; signups will get the Day 0 welcome email.
- **Speed-to-lead:** With Vapi and cron configured, new leads (with phone) get an outbound call within ~60s.
- **Responsive:** Test key pages at 375px, 768px, 1440px (see Phase 7 checklist).
- **E2E:** Run through: signup → onboarding (5 steps) → trigger a call → see it in activity feed.

---

## Quick reference — URL list

To regenerate the full list of URLs for Supabase, Stripe, Zoom, webhooks, and cron:

```bash
BASE_URL=https://recall-touch.com npm run urls:list
```

Use that output to fill in each service’s redirect / webhook / cron URLs.
