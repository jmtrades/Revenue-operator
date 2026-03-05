# What’s already done for you

These were run from the repo and succeeded.

---

## Done automatically

- **Supabase migrations** — All 168 migrations (including `workspace_voice_language`) were applied to your database. Schema is up to date.
- **Database verification** — `npm run verify:db` passed: Postgres and Supabase API both connect and can read `revenue_operator`.
- **Build** — `npm run build` completed successfully.
- **GitHub** — Latest code (voice/language, docs, migrations) is committed and pushed to `origin/main`.

---

## What you need to do (one-time setup)

These use your accounts; only you can do them.

### 1. Webhooks (paste these URLs)

Use the URLs below in each service.

| Service | Where | URL |
|--------|--------|-----|
| **Stripe** | Developers → Webhooks → Add endpoint | `https://www.recall-touch.com/api/billing/webhook` |
| **Vapi** | Project → Webhooks | `https://www.recall-touch.com/api/webhooks/vapi` |
| **Twilio SMS** | Phone number → Messaging → “A message comes in” | `https://www.recall-touch.com/api/webhooks/twilio/inbound` |
| **Twilio Voice** | Same number → Voice & Fax → “A call comes in” | `https://www.recall-touch.com/api/webhooks/twilio/voice` |
| **Google Calendar** (optional) | OAuth client → Redirect URI | `https://www.recall-touch.com/api/integrations/google-calendar/callback` |

### 2. Vercel env vars

In **Vercel → Project → Settings → Environment Variables**, ensure all required variables are set (see `docs/ENV_KEYS_REFERENCE.md` or `docs/PRODUCTION_CHECKLIST.md`). At minimum: Supabase URL + keys, `SESSION_SECRET`, `NEXT_PUBLIC_APP_URL`, Stripe keys, Vapi keys, `ELEVENLABS_API_KEY`, Twilio (if using SMS/voice), `CRON_SECRET`.

### 3. Supabase (if not already)

- **Exposed schemas:** Project Settings → API → Exposed schemas → include **`revenue_operator`**.
- Your `DATABASE_URL` and Supabase API keys in `.env.local` are already working (migrate and verify passed).

### 4. Deploy

Trigger a deploy on Vercel (e.g. push to `main` or “Redeploy” in the dashboard). After that, sign in, run through onboarding, and test a call/SMS to confirm everything works.

---

**Full checklist:** `docs/PRODUCTION_CHECKLIST.md`  
**Supabase + GitHub flow:** `docs/MIGRATE_SUPABASE_GITHUB.md`
