# Launch checklist

Use this before and after deploying to production (e.g. Vercel).

## Environment variables

- **SESSION_SECRET** — Secret to sign the session cookie (or use **ENCRYPTION_KEY**). When set, dashboard and protected APIs require auth; user only enters email once and session is restored on reload/tab/return. When unset, session is not enforced (backward compatible).
- **NEXT_PUBLIC_APP_URL** — Public app URL (e.g. `https://recall-touch.com`)
- **CRON_SECRET** — Secret for cron routes; set in Vercel and in cron caller
- **STRIPE_SECRET_KEY** — Stripe API key
- **STRIPE_WEBHOOK_SECRET** — From Stripe Dashboard → Webhooks → signing secret
- **STRIPE_PRICE_ID** — Price ID for subscription (14-day trial, card required)
- **Database** — Supabase (or existing Postgres) URL / keys as used by the app
- **Webhook / inbound** — Any signing secret for inbound webhooks (e.g. Resend, Twilio)
- **Resend / email** — If used: RESEND_API_KEY, EMAIL_FROM
- **Zoom / Twilio** — If used: ZOOM_*, TWILIO_* as required by your integration

## Webhooks

1. **Stripe**  
   - URL: `https://<your-domain>/api/billing/webhook`  
   - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`  
   - Verify `STRIPE_WEBHOOK_SECRET` is set and matches Stripe

2. **Inbound (conversations)**  
   - Signature verification and timestamp freshness enabled in `/api/webhooks/inbound`

## Cron

- All cron routes must require `Authorization: Bearer <CRON_SECRET>`
- Caller (e.g. Vercel Cron) must send this header
- Typical routes: process-queue, no-reply, renewal-reminder, learning, daily-trust, etc.
- **daily-trust** — Run once per day (e.g. 18 * * * *) to send “X conversations didn’t go quiet today” email to active workspaces. Requires RESEND_API_KEY.

## Stripe

- Checkout: 14-day trial, card required, `trial_period_days: 14`
- Activation flow: email → trial/start (create workspace) → checkout → success → onboarding with `workspace_id`
- Webhook sets `billing_status: "trial"` when subscription status is `trialing`, and `protection_renewal_at` from `trial_end`

## Domain

- Point production domain to the deployment (e.g. Vercel project)
- Ensure `NEXT_PUBLIC_APP_URL` matches the canonical domain

## Session (optional but recommended)

- Set **SESSION_SECRET** (or **ENCRYPTION_KEY**) so users only enter email once; session is restored on reload/tab/return.
- Middleware refreshes cookie on each request; protected APIs return 401 when no session.
- Log out: Preferences → Log out, or POST `/api/auth/logout`.

## E2E (optional)

```bash
npm run test:e2e
```

Requires app running (or use `npm run dev` in another terminal). Playwright smoke tests: activate page, dashboard without "Select account" dead state.

## Deploy (git push)

```bash
git add -A
git status   # sanity check
git commit -m "launch build"
git push origin main
```

Vercel will auto-deploy from `main`. After deploy:

1. Run a quick smoke test: landing → activate → (checkout if configured) → onboarding → live → value → overview.
2. Confirm workspace auto-selection (no “Select account” dead state).
3. Optionally run: `npm run lint`, `npm run test`, `npm run build` locally before pushing.
