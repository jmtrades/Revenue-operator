# Production checklist — do all of this

Use this as a single list. Replace `https://www.recall-touch.com` with your real domain if different.

**Migrate to Supabase + GitHub:** See [MIGRATE_SUPABASE_GITHUB.md](./MIGRATE_SUPABASE_GITHUB.md) for one path: run migrations, set env, push to GitHub, and verify caller-ready.

---

## 0. Launch-blocking (do first)

### SESSION_SECRET (required)

- [ ] In **Vercel** → **Settings** → **Environment Variables**, set **SESSION_SECRET** to a long random string (32+ characters). If this is missing, sign-in returns 503 and `/app` does not redirect unauthenticated users to `/sign-in`.

### Supabase email confirmation

- [ ] **Option A (recommended for launch):** Supabase Dashboard → **Authentication** → **Providers** → **Email** → turn **OFF** “Enable email confirmations”. Users can sign up and use the app immediately.
- [ ] **Option B:** Configure custom SMTP in Supabase (e.g. Resend: host `smtp.resend.com`, port 465, user `resend`, password = `RESEND_API_KEY`, sender `noreply@recall-touch.com`). If SMTP is not set and confirmations are ON, signup will show a friendly “Account created! Check your email to confirm” (no raw error).

### Google “Continue with Google”

- [ ] **Google Cloud Console** → **APIs & Services** → **Credentials** → **Create credentials** → **OAuth 2.0 Client ID** → **Web application** (not Desktop/Mobile).
- [ ] **Authorized redirect URI:** add exactly `https://<your-supabase-project-ref>.supabase.co/auth/v1/callback` (get the ref from Supabase Project Settings → API → Project URL, e.g. `https://xxxxx.supabase.co` → ref is `xxxxx`). No trailing slash.
- [ ] **Supabase Dashboard** → **Authentication** → **Providers** → **Google**: Enable, paste **Client ID** and **Client Secret** (from the same Web application OAuth client), then Save.
- [ ] If you see “Access blocked: Authorization Error” or “The OAuth client was not found” (Error 401 invalid_client), follow [GOOGLE_OAUTH_FIX.md](./GOOGLE_OAUTH_FIX.md).

---

## 1. Run database migrations (once)

- [ ] Get **Database URL** from Supabase: **Project Settings → Database → Connection string (URI)**. Use the **Transaction** pooler. Replace `[YOUR-PASSWORD]` with your DB password.
- [ ] In project root, create or edit `.env.local` and add:
  ```
  DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
  ```
- [ ] Run:
  ```bash
  npm run db:migrate
  ```
- [ ] In Supabase: **Project Settings → API → Exposed schemas** → add `revenue_operator` if not already there.

---

## 2. Configure webhooks

Run `npm run urls:webhooks` (or `npm run urls:webhooks https://your-domain.com`) to print these URLs.

### Stripe

- [ ] **Stripe Dashboard** → **Developers** → **Webhooks** → **Add endpoint**
- [ ] **Endpoint URL:**  
  `https://www.recall-touch.com/api/billing/webhook`
- [ ] **Events:** `checkout.session.completed`, `invoice.payment_succeeded`, `invoice.payment_failed`, `customer.subscription.deleted`
- [ ] Copy the **Signing secret** → in **Vercel** add env var **STRIPE_WEBHOOK_SECRET**

### Vapi

- [ ] **Vapi Dashboard** → project → **Webhooks**
- [ ] **Webhook URL:**  
  `https://www.recall-touch.com/api/webhooks/vapi`
- [ ] Ensure **call-started** and **end-of-call-report** are sent to this URL

### Twilio (SMS)

- [ ] **Twilio Console** → **Phone Numbers** → your number → **Messaging**
- [ ] **A message comes in:**  
  `https://www.recall-touch.com/api/webhooks/twilio/inbound`  
  Method: **POST**

### Twilio (Voice)

- [ ] Same number → **Voice & Fax** → **A call comes in:**  
  `https://www.recall-touch.com/api/webhooks/twilio/voice`  
  Method: **POST**

---

## 3. Vercel environment variables

Ensure these are set in **Vercel** → project → **Settings** → **Environment Variables** (see `docs/DEPLOYMENT.md` for full list). Minimum:

- [ ] **NEXT_PUBLIC_SUPABASE_URL**
- [ ] **NEXT_PUBLIC_SUPABASE_ANON_KEY**
- [ ] **SUPABASE_SERVICE_ROLE_KEY**
- [ ] **DATABASE_URL** (same Postgres URI as above)
- [ ] **SESSION_SECRET** (long random string)
- [ ] **NEXT_PUBLIC_APP_URL** = `https://www.recall-touch.com`
- [ ] **STRIPE_SECRET_KEY**, **NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY**, **STRIPE_WEBHOOK_SECRET**
- [ ] **STRIPE_PRICE_SOLO_MONTH**, **STRIPE_PRICE_SOLO_YEAR**, **STRIPE_PRICE_GROWTH_MONTH**, **STRIPE_PRICE_GROWTH_YEAR**, **STRIPE_PRICE_TEAM_MONTH**, **STRIPE_PRICE_TEAM_YEAR**
- [ ] **CRON_SECRET** (long random string)
- [ ] **RESEND_API_KEY**, **EMAIL_FROM** (for emails)
- [ ] **VAPI_API_KEY**, **VAPI_PHONE_NUMBER_ID**, **VAPI_DEMO_ASSISTANT_ID** (for voice)
- [ ] **ELEVENLABS_API_KEY** (for real TTS voices and language support)
- [ ] **TWILIO_ACCOUNT_SID**, **TWILIO_AUTH_TOKEN**, **TWILIO_PHONE_NUMBER** (for SMS)

---

## 4. Custom domain (Vercel)

- [ ] **Vercel** → project → **Settings** → **Domains** → add `www.recall-touch.com` (or your domain)

---

## 5. Google Calendar (optional)

- [ ] **Google Cloud Console** → **APIs & Services** → **Credentials** → **Create credentials** → **OAuth client ID** (Web application)
- [ ] **Authorized redirect URI:**  
  `https://www.recall-touch.com/api/integrations/google-calendar/callback`
- [ ] Enable **Google Calendar API** for the project
- [ ] In **Vercel** add: **GOOGLE_CALENDAR_CLIENT_ID**, **GOOGLE_CALENDAR_CLIENT_SECRET**
- [ ] Migrations (step 1) already include `google_calendar_tokens` table

---

## 6. Database (app access)

The app talks to the DB via **Supabase API** (not raw Postgres). So in addition to migrations:

- [ ] **Supabase Dashboard** → **Project Settings** → **API** → **Exposed schemas**: add **revenue_operator** (so the API can read/write that schema).
- [ ] In **Vercel** (and in **.env.local** for local dev): set **NEXT_PUBLIC_SUPABASE_URL** (e.g. `https://YOUR_REF.supabase.co`) and **SUPABASE_SERVICE_ROLE_KEY** (from same API page, or copy from Vercel).
- [ ] Run **`npm run verify:db`** locally: it checks Postgres (DATABASE_URL) and Supabase API (URL + key). Fix any reported missing env or schema.

---

## 7. Verify (caller-ready)

- [ ] Deploy (or redeploy) on Vercel; run `npm run verify:db` locally to confirm DB + Supabase API.
- [ ] Test **sign-in** and **create account**; confirm redirect to `/app/activity` and workspace name in sidebar (not stale “Portland Plumbing”).
- [ ] Complete **onboarding** (e.g. `/activate`): business, agent, voice, language, greeting → data saved to Supabase.
- [ ] Confirm **voice**: preview uses ElevenLabs when key is set; Vapi + Twilio voice webhooks point to your domain.
- [ ] Trigger a test webhook from Stripe/Vapi/Twilio if possible to confirm URLs respond.

---

**Reference:** Full details in `docs/DEPLOYMENT.md`. Supabase + GitHub flow: `docs/MIGRATE_SUPABASE_GITHUB.md`.
