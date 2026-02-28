# Launch Check

Quick verification steps before production deployment.

## Pre-Deploy

### Environment Variables

- [ ] **REQUIRED vars set in Vercel** (Production environment):
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `CRON_SECRET` (generate secure random string, at least 32 chars)
  - `SESSION_SECRET` or `ENCRYPTION_KEY` (at least 32 bytes)
  - `NEXT_PUBLIC_APP_URL` (e.g., `https://your-domain.com`)

- [ ] **Billing vars set** (if trial/checkout enabled):
  - `STRIPE_SECRET_KEY` (Stripe Dashboard → Developers → API keys → Secret key)
  - `STRIPE_PRICE_ID` (Stripe Dashboard → Products → Your product → Price ID, must be recurring subscription)
  - `STRIPE_WEBHOOK_SECRET` (see Webhooks section below)

- [ ] **Optional vars set** (if features enabled):
  - Email: `RESEND_API_KEY`, `EMAIL_FROM`
  - SMS: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
  - Zoom: `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET`, `ZOOM_WEBHOOK_SECRET`, `ZOOM_REDIRECT_URL`

- [ ] **Preview/Development vars** (optional, can use same values or test values)

### Database

- [ ] Supabase migrations applied (see `SUPABASE_PROD_CHECKLIST.md`)
- [ ] Database connection verified

### Cron Jobs

- [ ] Cron jobs configured (see `CRON_PROD.md`)
- [ ] Minimum: Core cron (`*/2 * * * *`) configured
- [ ] Recommended: Assurance delivery (`0 * * * *`) configured

### Stripe Webhook (If Billing Enabled)

- [ ] Webhook endpoint created in Stripe Dashboard:
  - URL: `https://your-domain.com/api/billing/webhook`
  - Events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
- [ ] Webhook signing secret copied to Vercel env var `STRIPE_WEBHOOK_SECRET`
- [ ] Test webhook sent from Stripe Dashboard → verify 200 response

## Deploy

1. Deploy to Vercel:
   ```bash
   vercel --prod
   ```

2. Verify build succeeds:
   - Check Vercel deployment logs
   - Ensure no build errors

## Prod gate

Launch proceeds only if this returns exit 0:

```bash
BASE_URL=https://recall-touch.com npm run prod:gate
```

## Post-Deploy

1. Run production smoke test:
   ```bash
   BASE_URL=https://your-domain.com \
   CRON_SECRET=your-cron-secret \
   npm run smoke
   ```

2. Verify endpoints:
   - [ ] `GET /api/system/core-status?workspace_id=...` returns valid response
   - [ ] `GET /api/operational/record-log?workspace_id=...` returns entries array
   - [ ] `GET /api/public/work/{external_ref}` returns neutral response (no internal IDs)
   - [ ] Message preview returns ok for default pack: `POST /api/message/preview` with workspace_id, domain_type, jurisdiction, channel, intent_type, slots (e.g. `general`, `UK`, `sms`, `follow_up`, `{}`) returns `{ ok: true, message_text, decision }`
   - [ ] Templates/policies seeded and approved: run `npx tsx scripts/seed-domain-packs.ts` (idempotent); global templates and policies exist with status `approved`

3. Verify trial start:
   - [ ] Navigate to `/activate`
   - [ ] Enter email and click "Start protection"
   - [ ] Verify `/api/trial/start` returns `{ ok: true, workspace_id: "..." }` (check browser network tab)
   - [ ] Verify `/api/billing/checkout` returns `{ ok: true, url: "https://checkout.stripe.com/..." }`
   - [ ] Checkout redirects to Stripe
   - [ ] Complete checkout with test card `4242 4242 4242 4242` (any future expiry, any CVC)
   - [ ] After checkout, redirects to `/connect` or dashboard
   - [ ] Verify idempotency: try starting trial again with same email → should return `{ ok: true, reason: "already_active" }` without creating duplicate
   - [ ] Check Vercel function logs for structured events: `trial_start_succeeded`, `checkout_started`

4. Verify onboarding:
   - [ ] Navigate to `/onboard`
   - [ ] Complete identity → source → record → send → waiting → complete
   - [ ] Record displays chronological orientation lines
   - [ ] Can add additional outcomes on complete page

5. Verify dashboard:
   - [ ] `/dashboard` shows Situation with correct empty state
   - [ ] `/dashboard/record` shows Record with correct empty state
   - [ ] `/dashboard/activity` shows Activity with correct empty state
   - [ ] `/dashboard/presence` shows Presence with correct empty state

## If Issues

- Check Vercel function logs for errors
- Verify environment variables are set correctly
- Check Supabase connection and migrations
- Verify cron jobs are running (check `/api/cron/core` heartbeat)
