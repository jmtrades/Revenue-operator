# Launch Checklist — Revenue Continuity

## Pre-Launch

### Environment Variables
- [ ] `SESSION_SECRET` — Session cookie signing secret
- [ ] `NEXT_PUBLIC_APP_URL` — Public app URL (e.g., `https://recall-touch.com`)
- [ ] `CRON_SECRET` — Secret for cron routes
- [ ] `STRIPE_SECRET_KEY` — Stripe API key
- [x] `STRIPE_WEBHOOK_SECRET` — Stripe webhook signing secret ✅ Added to production
- [ ] `STRIPE_PRICE_ID` — Price ID for subscription (14-day trial, card required)
- [ ] `RESEND_API_KEY` — For trial reminder emails
- [ ] `EMAIL_FROM` — Email sender address
- [ ] `TWILIO_ACCOUNT_SID` — Twilio account SID
- [ ] `TWILIO_AUTH_TOKEN` — Twilio auth token
- [ ] `TWILIO_PROXY_NUMBER` — Fallback proxy number (optional)
- [ ] `INBOUND_WEBHOOK_SECRET` — Secret for generic inbound webhook (optional)
- [ ] `DEV_SIM_SECRET` — Secret for dev simulation in production (optional)
- [ ] Database connection strings (Supabase URL + keys)

### Stripe Setup
- [ ] Create product and price in Stripe Dashboard
- [ ] Set `STRIPE_PRICE_ID` to the price ID
- [x] Configure webhook endpoint: `https://<your-domain>/api/billing/webhook` ✅ Connected
- [x] Subscribe to events:
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.paid`
  - `invoice.payment_failed`
- [x] Copy webhook signing secret to `STRIPE_WEBHOOK_SECRET`
  - **Secret:** `whsec_1XCa09uGBQt0HaPUH9V5yhGtxpqb4ocA`

### Database Migrations
- [ ] Run `supabase/migrations/billing_trial_fields.sql`
- [ ] Run `supabase/migrations/trial_reminder_fields.sql`
- [ ] Verify `workspaces` table has:
  - `trial_end_at`
  - `renews_at`
  - `trial_reminder_3d_sent_at`
  - `trial_reminder_24h_sent_at`

### Cron Jobs
- [ ] Set up cron for `/api/cron/trial-reminders`:
  - Schedule: Every hour (`0 * * * *`)
  - Header: `Authorization: Bearer <CRON_SECRET>`
- [ ] Set up cron for `/api/cron/process-queue`:
  - Schedule: Every minute (`* * * * *`)
  - Header: `Authorization: Bearer <CRON_SECRET>`
- [ ] Set up cron for `/api/cron/no-reply`:
  - Schedule: Every 15 minutes (`*/15 * * * *`)
  - Header: `Authorization: Bearer <CRON_SECRET>`

### Build & Tests
- [ ] `npm run build` passes
- [ ] `npm run test` passes (or at least no critical failures)
- [ ] No TypeScript errors
- [ ] No ESLint errors (warnings OK)

## Post-Launch Verification

### Onboarding Flow
- [ ] New user can enter email on `/activate`
- [ ] Redirects to Stripe checkout
- [ ] Card required, 14-day trial shown
- [ ] After checkout, redirects to `/connect`
- [ ] Phone number auto-provisions
- [ ] User can test by sending message
- [ ] `/live` page shows timeline and reply
- [ ] User reaches dashboard successfully

### Billing
- [ ] Trial starts correctly (`billing_status: "trial"`)
- [ ] `trial_end_at` and `renews_at` are set
- [ ] Reminder emails send 3 days before renewal
- [ ] Reminder emails send 24 hours before renewal
- [ ] Subscription auto-renews after trial
- [ ] Payment failure shows banner (doesn't block dashboard)
- [x] Stripe webhook endpoint connected ✅

### Security
- [ ] `/api/dev/simulate-inbound` blocked in production (or requires `DEV_SIM_SECRET`)
- [ ] Session persists across page reloads
- [ ] Protected routes require session
- [x] Webhook signatures verified ✅ STRIPE_WEBHOOK_SECRET configured

### Twilio
- [ ] Phone number provisions successfully
- [ ] Inbound SMS creates conversation
- [ ] Outbound SMS sends correctly
- [ ] Retry logic doesn't loop forever

### UI/UX
- [ ] All pages use shared components (Card, PageHeader, etc.)
- [ ] No empty states show "No data" — show monitoring instead
- [ ] Error states show "Still monitoring — retrying"
- [ ] Loading states show "Restoring your conversations"
- [ ] Mobile responsive
- [ ] No overflow issues

## Monitoring

### Key Metrics
- [ ] Track trial → paid conversion rate
- [ ] Track onboarding completion rate
- [ ] Monitor error rates in logs
- [ ] Monitor Stripe webhook delivery
- [ ] Monitor Twilio API usage

### Alerts
- [ ] Stripe webhook failures
- [ ] Twilio provisioning failures
- [ ] Database connection errors
- [ ] High error rates

## Rollback Plan

If issues occur:
1. Pause new signups (remove CTA from landing page)
2. Check Stripe webhook logs
3. Check database for stuck records
4. Review error logs
5. Fix and redeploy
