# Recall Touch — Production Deployment

Complete these steps in order. Do not skip.

**Short checklist:** See [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md) for a single list you can tick off.

---

## 1. Run database migrations

Migrations must be applied to your **production** Supabase database once.

1. Get your **Database URL** from Supabase: **Project Settings → Database → Connection string (URI)**. Use the **Transaction** or **Session** pooler. Replace `[YOUR-PASSWORD]` with your database password.

2. Locally (or in CI) set `DATABASE_URL` and run:
   ```bash
   DATABASE_URL='postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres' npm run db:migrate
   ```
   Or copy the connection string into `.env.local` as `DATABASE_URL`, then run:
   ```bash
   npm run db:migrate
   ```

3. Ensure **revenue_operator** is in **Exposed schemas**: Supabase Dashboard → **Project Settings → API → Exposed schemas** → add `revenue_operator`.

---

## 2. Configure webhooks (point to your production URL)

Replace `https://www.recall-touch.com` with your actual production domain if different.

### Stripe

1. **Stripe Dashboard → Developers → Webhooks → Add endpoint**
2. **Endpoint URL:** `https://www.recall-touch.com/api/billing/webhook`
3. **Events to send:**  
   - `checkout.session.completed`  
   - `invoice.payment_succeeded`  
   - `invoice.payment_failed`  
   - `customer.subscription.deleted`
4. Copy the **Signing secret** and set in Vercel as `STRIPE_WEBHOOK_SECRET`.

### Vapi

1. **Vapi Dashboard** → your project → **Webhooks** (or **Phone** / **Assistants** settings).
2. **Webhook URL:** `https://www.recall-touch.com/api/webhooks/vapi`
3. Ensure **call-started** and **end-of-call-report** (or equivalent) are sent to this URL.

### Twilio (SMS)

1. **Twilio Console** → **Phone Numbers** → your number → **Messaging**.
2. **A message comes in:** Webhook = `https://www.recall-touch.com/api/webhooks/twilio/inbound`, method **POST**.

### Twilio (Voice, if using)

1. **Voice & Fax** → **A call comes in:** Webhook = `https://www.recall-touch.com/api/webhooks/twilio/voice`, method **POST**.

---

## 3. Pricing (Stripe ↔ website)

The website displays the same prices as your Stripe products. Ensure in **Stripe Dashboard** you have products/prices for:

- **Starter (Solo):** $297/mo, $2,970/yr  
- **Growth:** $497/mo, $5,000/yr  
- **Scale (Team):** $2,400/mo, $19,000/yr  

Set in Vercel (or .env):

- `STRIPE_PRICE_SOLO_MONTH`, `STRIPE_PRICE_SOLO_YEAR`
- `STRIPE_PRICE_GROWTH_MONTH`, `STRIPE_PRICE_GROWTH_YEAR`
- `STRIPE_PRICE_TEAM_MONTH`, `STRIPE_PRICE_TEAM_YEAR`

These must match the **Price IDs** of the corresponding Stripe prices.

---

## 4. Cron jobs (Vercel)

Crons are defined in `vercel.json`. Vercel will call them on schedule. You must set:

- **CRON_SECRET** in Vercel (any long random string). Cron routes that require auth expect `Authorization: Bearer <CRON_SECRET>` or the same value in a header they check.

If your cron routes use a different auth method, configure the **Vercel Cron** to send that header (e.g. in dashboard or via middleware).

---

## 5. Custom domain and app URL

1. **Vercel** → your project → **Settings → Domains** → add your domain (e.g. `www.recall-touch.com`).
2. Set in **Environment Variables:**  
   **NEXT_PUBLIC_APP_URL** = `https://www.recall-touch.com` (no trailing slash).

This is used for links in emails, redirects, and webhooks.

---

## 6. Environment variables checklist (Vercel)

| Variable | Required | Notes |
|----------|----------|------|
| NEXT_PUBLIC_SUPABASE_URL | Yes | Supabase project URL |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Yes | Supabase anon key |
| SUPABASE_SERVICE_ROLE_KEY | Yes | Supabase service role key |
| DATABASE_URL | Yes | Postgres connection string (for migrations; can be same as Supabase) |
| SESSION_SECRET | Yes | Long random string for auth cookies |
| NEXT_PUBLIC_APP_URL | Yes | Production URL, e.g. https://www.recall-touch.com |
| STRIPE_SECRET_KEY | Yes (for billing) | Stripe secret key |
| NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY | Yes (for billing) | Stripe publishable key |
| STRIPE_WEBHOOK_SECRET | Yes (for billing) | From Stripe webhook endpoint |
| STRIPE_PRICE_* | Yes (for billing) | All tier/month/year price IDs |
| RESEND_API_KEY | Recommended | Transactional email |
| EMAIL_FROM | Recommended | e.g. Recall Touch \<noreply@yourdomain.com\> |
| VAPI_API_KEY | For voice | Vapi server key |
| VAPI_PUBLIC_KEY | For demo voice | Vapi public key |
| VAPI_PHONE_NUMBER_ID | For voice | Vapi phone number id |
| VAPI_DEMO_ASSISTANT_ID | For /demo voice | Assistant id for "Talk with voice" |
| TWILIO_ACCOUNT_SID | For SMS | Twilio account SID |
| TWILIO_AUTH_TOKEN | For SMS | Twilio auth token |
| TWILIO_PHONE_NUMBER | For SMS | e.g. +1234567890 |
| CRON_SECRET | For crons | Long random string |

---

## 7. Google Calendar (optional)

1. Create OAuth 2.0 credentials in [Google Cloud Console](https://console.cloud.google.com/apis/credentials): **APIs & Services → Credentials → Create credentials → OAuth client ID** (Web application). Add authorized redirect URI: `https://www.recall-touch.com/api/integrations/google-calendar/callback` (or your domain).
2. Set in Vercel: `GOOGLE_CALENDAR_CLIENT_ID`, `GOOGLE_CALENDAR_CLIENT_SECRET`. Optionally `GOOGLE_CALENDAR_REDIRECT_URI` if different from default.
3. Enable **Google Calendar API** for the project in Cloud Console.
4. Run migrations so `google_calendar_tokens` table exists.

---

## 8. Monitoring (optional)

- Add error tracking (e.g. Sentry) and set `SENTRY_DSN` if you use it.
- Use Vercel Analytics or your own analytics for traffic and performance.

---

## 9. After deployment

- Run **migrations** (step 1) once against production DB.
- Confirm **webhooks** (step 2) are reachable (Stripe/Vapi/Twilio dashboards often show a test or recent deliveries).
- Test sign-in, onboarding, and a test call or SMS if you have voice/SMS configured.
