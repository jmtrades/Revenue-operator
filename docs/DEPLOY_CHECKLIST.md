# Recall Touch — Deploy checklist

Use this before going live so the product is **ready for people to use**.

---

## 1. Build and tests

```bash
npm ci
npm run build
npm run lint
npm run test
```

All must pass. Fix any failures before deploying.

---

## 2. Environment variables

### Required (app won’t work without these)

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side Supabase access |
| `SESSION_SECRET` | Session cookie signing (32+ chars) |
| `NEXT_PUBLIC_APP_URL` | Full app URL (e.g. `https://www.revenueoperator.ai`) |
| `CRON_SECRET` | Protects cron endpoints (any secret string) |

### Required for full experience

| Variable | Purpose |
|----------|---------|
| `VAPI_API_KEY` | AI answers calls |
| `VAPI_PHONE_NUMBER_ID` | Outbound / Twilio handoff |
| `ELEVENLABS_API_KEY` | Voice preview and natural TTS |
| `STRIPE_SECRET_KEY` + `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Billing and trials |
| `TWILIO_ACCOUNT_SID` + `TWILIO_AUTH_TOKEN` | Connect phone numbers |

### Optional

- `LEAD_INBOUND_WEBHOOK_SECRET` — for external lead webhook auth
- `DATABASE_URL` or `SUPABASE_DB_URL` — for running migrations (or use Supabase CLI)
- Resend, Google Calendar, Zoom — see `.env.example`

---

## 3. Database

- [ ] Supabase project created
- [ ] **Exposed schema:** Project Settings → API → Exposed schemas → add **`revenue_operator`**
- [ ] Migrations applied: `npm run db:migrate` (with `DATABASE_URL`) or `supabase link && supabase db push`
- [ ] Verify: `npm run verify:db`

---

## 4. Core flow (manual check)

After deploy, confirm:

1. **Homepage** → click **Start free** → lands on **/activate**
2. **/activate** → complete steps → success (or sign-in) → can reach **/app/onboarding** or **/app/activity**
3. **/sign-in** → sign in → redirect to app
4. **/demo** → demo section loads and auto-plays (or shows “Skip to result”)
5. **/pricing** → toggle Monthly/Annual works; CTAs go to **/activate**
6. **App** → **Leads** → “Add lead” opens panel; **Send message** opens Messages with that lead selected
7. **App** → **Agents** → 6-step stepper (Identity → Voice → Knowledge → Behavior → Test → Go live); **Create agent** (or ⌘K) opens template modal; voice preview when ElevenLabs set
8. **App** → **Messages** → threads load from API; send uses POST /api/messages/send; `?lead_id=` or `?to=` (phone) selects or adds thread

---

## 5. Cron (production)

If you use cron jobs, set:

- `GET /api/cron/core` — e.g. every 2 min, header `Authorization: Bearer <CRON_SECRET>`
- `GET /api/cron/assurance-delivery` — e.g. hourly, same auth

See README for full optional cron table.

---

## 6. E2E (optional)

```bash
npm run test:e2e
```

Runs Playwright against `PLAYWRIGHT_BASE_URL` or starts dev server. Covers activate page and critical path (home → Start free → /activate).

---

## 7. Go-live

- [ ] All steps above done
- [ ] No “Sign-in isn’t set up yet” (SESSION_SECRET set)
- [ ] No “ElevenLabs not configured” on voice preview (or acceptable to show toast)
- [ ] Stripe in live mode if taking payments
- [ ] `NEXT_PUBLIC_APP_URL` is the real production URL

Once this checklist is complete, the app is **ready for people to use**.
