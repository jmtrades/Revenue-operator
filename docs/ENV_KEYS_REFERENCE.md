# Every API Key & Environment Variable — Complete Reference

Set these in **Vercel** (production) and/or **.env.local** (local). None of these should be committed with real values except in `.env.example` as placeholders.

---

## Core (required for app to run)

| Variable | Required | Where | Notes |
|----------|----------|--------|------|
| **NEXT_PUBLIC_SUPABASE_URL** | Yes | Supabase Dashboard → Project Settings → API | Project URL, e.g. `https://xxxx.supabase.co` |
| **NEXT_PUBLIC_SUPABASE_ANON_KEY** | Yes | Same | Anon (public) key |
| **SUPABASE_SERVICE_ROLE_KEY** | Yes | Same | Service role (secret) key — app uses this for all DB access |
| **SESSION_SECRET** | Yes | You generate | Long random string; signs session cookie. Or use **ENCRYPTION_KEY** (32+ chars) as fallback |
| **NEXT_PUBLIC_APP_URL** | Yes (prod) | You set | e.g. `https://www.recall-touch.com` (no trailing slash) |
| **DATABASE_URL** | Yes (migrations) | Supabase → Project Settings → Database → Connection string | Postgres URI for `npm run db:migrate` |
| **CRON_SECRET** | Yes (prod) | You generate | Long random string; cron routes use `Authorization: Bearer <CRON_SECRET>` |

---

## Stripe (billing)

| Variable | Required | Where | Notes |
|----------|----------|--------|------|
| **STRIPE_SECRET_KEY** | Yes (billing) | Stripe Dashboard → Developers → API keys | Secret key (sk_…) |
| **NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY** | Yes (billing) | Same | Publishable key (pk_…) |
| **STRIPE_WEBHOOK_SECRET** | Yes (billing) | Stripe → Webhooks → Add endpoint → Signing secret | From webhook endpoint |
| **STRIPE_PRICE_SOLO_MONTH** | Yes (billing) | Stripe → Products → Price ID | e.g. price_xxx |
| **STRIPE_PRICE_SOLO_YEAR** | Yes (billing) | Same | |
| **STRIPE_PRICE_GROWTH_MONTH** | Yes (billing) | Same | |
| **STRIPE_PRICE_GROWTH_YEAR** | Yes (billing) | Same | |
| **STRIPE_PRICE_TEAM_MONTH** | Yes (billing) | Same | |
| **STRIPE_PRICE_TEAM_YEAR** | Yes (billing) | Same | |
| **STRIPE_DEFAULT_PRICE_ID** | Optional | Legacy / single price | Used by some settlement/health checks |
| **STRIPE_API_KEY** | Optional | Alias for STRIPE_SECRET_KEY in some code paths | |
| **NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID** | Optional | Stripe Pricing Table embed | If using embedded pricing table |

---

## Vapi (voice AI — calls & demo)

| Variable | Required | Where | Notes |
|----------|----------|--------|------|
| **VAPI_API_KEY** | Yes (voice) | Vapi dashboard | Server-side API key |
| **NEXT_PUBLIC_VAPI_PUBLIC_KEY** | Yes (demo) | Vapi dashboard | Public key for browser “Talk with voice” on /demo |
| **VAPI_PHONE_NUMBER_ID** | Yes (Twilio→Vapi) | Vapi dashboard | Your Vapi phone number id for inbound call handoff |
| **VAPI_DEMO_ASSISTANT_ID** | Recommended | Vapi dashboard | Assistant id for /demo “Talk with voice” button |
| **VAPI_PUBLIC_KEY** | Optional | Same as NEXT_PUBLIC_VAPI_PUBLIC_KEY (some code may read this) | |

---

## Resend (email)

| Variable | Required | Where | Notes |
|----------|----------|--------|------|
| **RESEND_API_KEY** | Recommended | Resend dashboard | For welcome, agent-live, trial reminders, etc. |
| **EMAIL_FROM** | Recommended | You set | e.g. `Recall Touch <noreply@recall-touch.com>` (must be verified in Resend) |

---

## Twilio (SMS & voice)

| Variable | Required | Where | Notes |
|----------|----------|--------|------|
| **TWILIO_ACCOUNT_SID** | Yes (SMS) | Twilio Console → Account | |
| **TWILIO_AUTH_TOKEN** | Yes (SMS) | Same | |
| **TWILIO_PHONE_NUMBER** | Recommended | Twilio → Phone Numbers | e.g. +15551234567 |
| **TWILIO_MESSAGING_SERVICE_SID** | Optional | Twilio → Messaging → Services | Use instead of TWILIO_PHONE_NUMBER if using Messaging Service |
| **TWILIO_PROXY_NUMBER** | Optional | Used by some provisioning routes | |

---

## ElevenLabs (voice previews — natural TTS)

| Variable | Required | Where | Notes |
|----------|----------|--------|------|
| **ELEVENLABS_API_KEY** | Recommended | ElevenLabs dashboard | For /api/agent/speak (previews in app, onboarding, activate) |
| **ELEVENLABS_VOICE_ID** | Optional | ElevenLabs → Voices → voice_id | Default is Rachel; set for a different default voice |

---

## Google Calendar (optional)

| Variable | Required | Where | Notes |
|----------|----------|--------|------|
| **GOOGLE_CALENDAR_CLIENT_ID** | If using Calendar | Google Cloud Console → APIs & Services → Credentials | OAuth 2.0 Client ID (Web) |
| **GOOGLE_CALENDAR_CLIENT_SECRET** | If using Calendar | Same | Client secret |
| **GOOGLE_CALENDAR_REDIRECT_URI** | Optional | You set | Default: `NEXT_PUBLIC_APP_URL/api/integrations/google-calendar/callback` |

---

## Zoom (optional — call/meeting integration)

| Variable | Required | Where | Notes |
|----------|----------|--------|------|
| **ZOOM_CLIENT_ID** | If using Zoom | Zoom App Marketplace → OAuth app | |
| **ZOOM_CLIENT_SECRET** | If using Zoom | Same | |
| **ZOOM_WEBHOOK_SECRET** | If using Zoom webhooks | Zoom → Webhooks | |
| **ZOOM_REDIRECT_URL** | Optional | Your app redirect URI | |

---

## AI / LLM (optional — chat, forensics, conversation state)

| Variable | Required | Where | Notes |
|----------|----------|--------|------|
| **ANTHROPIC_API_KEY** | If using /api/agent/chat | Anthropic console | |
| **OPENAI_API_KEY** | If using forensics, Zoom analysis, AI templates, conversation resolver | OpenAI dashboard | Used in multiple internal modules |

---

## Security / internal / ops

| Variable | Required | Where | Notes |
|----------|----------|--------|------|
| **ENCRYPTION_KEY** | Optional (alt to SESSION_SECRET) | You generate | 32+ chars; used for session signing and Zoom token encryption if set |
| **PUBLIC_VIEW_SALT** | Recommended (prod) | You generate | Public record hashing; founder export auth |
| **FOUNDER_EXPORT_KEY** | Recommended (prod) | You generate | Auth for /api/internal/founder/export and scenario ingest |
| **ADMIN_EMAIL** | Optional | Your email | Only this email can access /admin routes |
| **ADMIN_SECRET** | Optional | You generate | Alternative to CRON_SECRET for admin/dlq auth |
| **OPS_TOKEN** | Optional | You generate | For /api/ops/activation-report |
| **DOCTRINE_ENFORCED** | Optional (prod) | Set to `1` | Enables doctrine enforcement (legacy webhook paths disabled) |

---

## Webhooks / ingest (optional)

| Variable | Required | Where | Notes |
|----------|----------|--------|------|
| **WEBHOOK_SECRET** | If using /api/webhooks/inbound | You set | Verify inbound webhook payloads |
| **INBOUND_WEBHOOK_SECRET** | If using /api/webhooks/inbound-generic | You set | Bearer token for generic inbound |
| **DEV_SIM_SECRET** | Optional (dev) | You set | Allows /api/dev/simulate-inbound and verify-cron in non-production |
| **SCENARIO_INGEST_KEY** | Optional | You set | Bearer auth for /api/internal/scenarios/incident |

---

## App URL / base URL (alternate names)

| Variable | Required | Where | Notes |
|----------|----------|--------|------|
| **APP_URL** | Optional | Same as NEXT_PUBLIC_APP_URL | Used in some server-only code |
| **BASE_URL** | Optional | Same | Scripts and some email links |
| **VERCEL_URL** | Auto (Vercel) | Vercel sets this | e.g. your-app.vercel.app |

---

## Other / feature flags

| Variable | Required | Where | Notes |
|----------|----------|--------|------|
| **ECONOMIC_SETTLEMENT_ENABLED** | Optional | Set to `true` | Enables economic settlement checks |
| **DISABLE_UNSAFE_WRITE_GUARD** | Do not set in prod | — | Disables write guard (unsafe) |
| **ENABLE_UNSAFE_WRITE_GUARD** | Optional (local) | Set to `true` | Enables write guard in development |
| **NEXT_PUBLIC_OPS_DEV_MAGIC_LINK** | Optional | Set to `true` | Ops login magic link in dev |
| **OPS_DEV_MAGIC_LINK** | Optional | Same | |
| **DEMO_EXTERNAL_REF** / **NEXT_PUBLIC_DEMO_EXTERNAL_REF** | Optional | For demo/public work pages | |
| **WORKSPACE_ID** | Optional | Scripts (e.g. smoke, verify-install) | For script-based testing |
| **DEMO_OWNER_ID** / **DEMO_WORKSPACE_ID** | Optional | create-demo-workspace script | |

---

## One-line checklist (copy into Vercel / .env.local)

```bash
# Core
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
SESSION_SECRET=
NEXT_PUBLIC_APP_URL=
CRON_SECRET=

# Stripe
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_SOLO_MONTH=
STRIPE_PRICE_SOLO_YEAR=
STRIPE_PRICE_GROWTH_MONTH=
STRIPE_PRICE_GROWTH_YEAR=
STRIPE_PRICE_TEAM_MONTH=
STRIPE_PRICE_TEAM_YEAR=

# Vapi
VAPI_API_KEY=
NEXT_PUBLIC_VAPI_PUBLIC_KEY=
VAPI_PHONE_NUMBER_ID=
VAPI_DEMO_ASSISTANT_ID=

# Resend
RESEND_API_KEY=
EMAIL_FROM=

# Twilio
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# ElevenLabs
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=

# Google Calendar (optional)
GOOGLE_CALENDAR_CLIENT_ID=
GOOGLE_CALENDAR_CLIENT_SECRET=

# Security / internal
PUBLIC_VIEW_SALT=
FOUNDER_EXPORT_KEY=
ADMIN_EMAIL=

# Zoom (optional)
ZOOM_CLIENT_ID=
ZOOM_CLIENT_SECRET=
ZOOM_WEBHOOK_SECRET=

# AI (optional)
ANTHROPIC_API_KEY=
OPENAI_API_KEY=

# Optional / alternate
ENCRYPTION_KEY=
WEBHOOK_SECRET=
INBOUND_WEBHOOK_SECRET=
STRIPE_DEFAULT_PRICE_ID=
```

---

**Reference:** `.env.example` in project root; `docs/DEPLOYMENT.md` and `docs/PRODUCTION_CHECKLIST.md` for deployment steps.
