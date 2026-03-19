# Recall Touch — Complete Implementation Prompt for Cursor

> **Context**: This is a comprehensive implementation guide for Cursor. Cowork (Claude) has completed
> all code changes listed below. This document covers what was done and the remaining items Cursor
> must handle to bring Recall Touch to full production readiness.

---

## WHAT HAS BEEN COMPLETED (Do Not Redo)

### 1. Voice System Migration (40+ files)
- **Sole provider**: Recall (self-hosted) is the ONLY voice provider
- **Deprecated**: Vapi routes return 410 Gone (`/api/vapi/*`, `/api/agent/create-vapi`, `/api/agent/demo-assistant`)
- **ElevenLabs removed**: npm package removed, all API calls replaced with `VOICE_SERVER_URL`
- **Database migrated**: `elevenlabs_voice_id` → `voice_id` on BOTH `agents` and `workspaces` tables
- **`vapi_agent_id` dropped** from agents table entirely
- **UI updated**: ActivateWizard, AgentsPageClient, settings/agent all use `RECALL_VOICES` and `RecallVoice` type
- **Voice preview**: `/api/agent/speak`, `/api/agent/preview-voice` call `VOICE_SERVER_URL/tts/stream`
- **Voices endpoint**: `/api/agent/voices` returns from `RECALL_VOICES` constant (30+ voices)

### 2. API Hardening
- **Shared validation**: `src/lib/api/validate.ts` with `parseBody()`, `phoneSchema`, `emailSchema`, `workspaceIdSchema`
- **Zod on all critical routes**: outbound/call, contacts, sms/send, signup, workspace/create
- **Rate limiting wired**: Upstash Redis code in place (needs env vars — see below)

### 3. Onboarding Consolidation
- **Single entry**: `/activate` is the only onboarding flow
- **14 files fixed**: auth callbacks, signup APIs, email templates, nav, settings all point to `/activate`
- **Email verification**: enforcement on workspace creation (403 when unverified), resend endpoint at `/api/auth/resend-verification`

### 4. Database Migrations Applied to Production
- `voice_id` column added to `agents` table, backfilled from `elevenlabs_voice_id`
- `elevenlabs_voice_id` renamed to `voice_id` on `workspaces` table
- `vapi_agent_id` column dropped from `agents` table
- `trial_ends_at` column exists on `workspaces` table
- All 6 agents have `voice_id = 'us-female-warm-receptionist'`

### 5. Error Handling (Already Comprehensive)
- `global-error.tsx` at root level
- 18+ route-level `error.tsx` files
- `ErrorBoundary.tsx` component with categorization (network/auth/data/unknown)
- Error reporting API at `/api/errors/report`
- `TranslatedErrorBoundary` for i18n

### 6. Cron Architecture (Intentional Design)
- 14 crons in `vercel.json` (directly scheduled)
- 74 additional crons orchestrated by `/api/cron/core` bundler (runs every 2 min)
- All use `runSafeCron()` wrapper with overlap protection and 55s timeout
- Trial expiry cron at `/api/cron/trial-expiry` (daily 6 AM UTC)

### 7. Deployment
- Production deployment READY at `www.recall-touch.com`
- Commit `55e50c7` + subsequent fixes deployed via Vercel auto-deploy from GitHub main
- Next.js 16.1.6 Turbopack, Node 22.x

---

## REMAINING WORK FOR CURSOR

### Priority 1: Deploy Voice Server (GPU Required)

The self-hosted voice server is at `services/voice-server/`. It's a Python FastAPI app with:
- Orpheus TTS (primary), Fish Speech, Kokoro, CosyVoice2
- Faster-Whisper STT + Silero VAD
- Real-time WebSocket for Twilio Media Streams
- 30+ voice profiles

**Deployment options** (all configs exist):
- `services/voice-server/fly.toml` — Fly.io GPU (A10-large)
- `services/voice-server/deploy/render.yaml` — Render
- `services/voice-server/Dockerfile` — Any Docker host with NVIDIA GPU

**Steps:**
1. Choose a GPU hosting provider (Fly.io recommended: ~$100-150/mo)
2. Deploy using the existing Dockerfile
3. Set these env vars on the voice server:
   - `LLM_ENDPOINT=https://www.recall-touch.com/api/agent/respond`
   - `PORT=8100`
   - `HOST=0.0.0.0`
4. Set `VOICE_SERVER_URL=https://<your-voice-server-domain>` in Vercel env vars
5. Test: `curl https://<domain>/health` should return TTS/STT engine status
6. Test a real call through Twilio → WebSocket → voice server

### Priority 2: Set Upstash Redis Environment Variables

Rate limiting code is already wired. Just need the credentials:

1. Go to https://console.upstash.com
2. Create a Redis database (free tier works initially)
3. Copy the REST URL and token
4. Add to Vercel env vars:
   - `UPSTASH_REDIS_REST_URL=https://...`
   - `UPSTASH_REDIS_REST_TOKEN=...`

**Files using rate limiting:**
- `src/app/api/outbound/call/route.ts` (60 req/min)
- `src/app/api/agent/speak/route.ts` (10 req/min)
- `src/app/api/auth/resend-verification/route.ts` (3 req/min)

### Priority 3: Commit & Push Latest Code Changes

The following changes were made locally but need to be committed and pushed:

**Files modified since last commit (`55e50c7`):**
- `src/app/api/agents/route.ts` — removed vapi_agent_id, elevenlabs_voice_id → voice_id
- `src/app/api/agents/[id]/analytics/route.ts` — removed vapi_agent_id from SELECT
- `src/app/api/agents/[id]/test-call/route.ts` — removed vapi_agent_id
- `src/app/api/agent/create-vapi/route.ts` — deprecated with 410 Gone
- `src/app/api/agent/demo-assistant/route.ts` — deprecated with 410 Gone
- `src/app/api/workspace/create/route.ts` — voice_id (already correct)
- `src/app/api/workspace/agent/route.ts` — elevenlabs_voice_id → voice_id

**Commit message:**
```
fix: remove all remaining vapi_agent_id and elevenlabs_voice_id references

Database columns have been dropped/renamed:
- agents.vapi_agent_id: dropped
- workspaces.elevenlabs_voice_id: renamed to voice_id

Code changes:
- Remove vapi_agent_id from all SELECT/INSERT queries
- Replace elevenlabs_voice_id with voice_id in workspace queries
- Deprecate /api/agent/create-vapi and /api/agent/demo-assistant (410 Gone)
```

### Priority 4: Clean Up Deprecated Vapi/ElevenLabs Modules

These files are isolated dead code that should be removed entirely:

```
DELETE: src/lib/vapi/env.ts
DELETE: src/lib/vapi/client.ts
DELETE: src/lib/vapi/ (entire directory)
DELETE: src/lib/voice/providers/elevenlabs-conversational.ts
DELETE: src/app/api/webhooks/vapi/route.ts
DELETE: src/app/api/webhooks/elevenlabs/route.ts
DELETE: src/app/api/vapi/ (entire directory — already returns 410)
```

After deletion, search for any remaining imports from these paths and remove them.

### Priority 5: Stripe Webhook Hardening

Verify these Stripe integration points:

1. **Webhook signature verification** — Ensure `/api/webhooks/stripe/route.ts` verifies `stripe-signature` header
2. **Idempotency** — Check webhook dedup logic (should use `raw_webhook_events` table)
3. **Subscription lifecycle** — Verify these events are handled:
   - `checkout.session.completed` → activate workspace
   - `customer.subscription.updated` → plan changes
   - `customer.subscription.deleted` → deactivation
   - `invoice.payment_failed` → dunning flow
4. **Billing page** — Verify `/app/billing` correctly shows plan info and Stripe portal link

### Priority 6: Twilio Integration Verification

1. **Phone provisioning** — `/api/twilio/provision-number` should work with Twilio credentials
2. **Inbound calls** — Verify TwiML webhook URL points to voice server WebSocket
3. **Outbound calls** — `/api/outbound/call` creates Twilio call with correct TwiML
4. **SMS** — `/api/sms/send` sends via Twilio with proper from/to numbers
5. **Webhook security** — Verify Twilio signature validation on incoming webhooks

### Priority 7: Voice Quality Monitoring Cron

Create `/src/app/api/cron/voice-quality/route.ts`:

```typescript
// Checks voice server health every 5 minutes
// Alerts if:
// - Voice server is unreachable (VOICE_SERVER_URL/health fails)
// - Latency exceeds 500ms threshold
// - Active sessions exceed 80% of max concurrent
// Logs to a voice_health_checks table or sends alert via webhook
```

Add to vercel.json crons:
```json
{ "path": "/api/cron/voice-quality", "schedule": "*/5 * * * *" }
```

### Priority 8: Environment Variables Audit

Verify ALL required env vars are set in Vercel:

**Must have (critical):**
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role
- `STRIPE_SECRET_KEY` — Stripe API key
- `STRIPE_WEBHOOK_SECRET` — Stripe webhook signing secret
- `TWILIO_ACCOUNT_SID` — Twilio credentials
- `TWILIO_AUTH_TOKEN` — Twilio credentials
- `TWILIO_PHONE_NUMBER` — Primary Twilio number
- `VOICE_PROVIDER=recall` — Must be "recall"
- `VOICE_SERVER_URL` — URL to deployed voice server (Priority 1)
- `DEFAULT_VOICE_ID=us-female-warm-receptionist`

**Should have (functionality):**
- `UPSTASH_REDIS_REST_URL` — For rate limiting (Priority 2)
- `UPSTASH_REDIS_REST_TOKEN` — For rate limiting
- `RESEND_API_KEY` — For transactional emails
- `CRON_SECRET` — Shared secret for cron authentication
- `NEXT_PUBLIC_POSTHOG_KEY` — Analytics
- `NEXT_PUBLIC_POSTHOG_HOST` — Analytics host

**Remove (deprecated):**
- `ELEVENLABS_API_KEY` — No longer used
- `ELEVENLABS_PHONE_NUMBER_ID` — No longer used
- `ELEVENLABS_WEBHOOK_SECRET` — No longer used
- `VAPI_API_KEY` — No longer used
- `VAPI_PHONE_NUMBER_ID` — No longer used
- `VAPI_WEBHOOK_SECRET` — No longer used
- `VAPI_DEMO_ASSISTANT_ID` — No longer used

### Priority 9: Production Smoke Tests

After voice server deployment, run this test sequence:

1. **Homepage**: `curl -I https://www.recall-touch.com` → 200
2. **Health**: `curl https://www.recall-touch.com/api/system/health` → 200 + voice server status
3. **Voice health**: `curl https://<voice-server>/health` → 200 with TTS/STT info
4. **Signup flow**: Create account → verify email → complete `/activate` wizard
5. **Agent creation**: Create agent with Recall voice → voice preview works
6. **Test call**: Use agent test-call feature → Twilio rings → voice server handles conversation
7. **Outbound call**: Trigger outbound via `/api/outbound/call` → Twilio call placed
8. **Trial expiry**: Verify cron at `/api/cron/trial-expiry` returns success
9. **Billing**: Subscribe via Stripe → workspace activated → plan shows in settings

### Priority 10: Performance & Security Final Pass

1. **CSP headers** — Add Content-Security-Policy in `next.config.ts`
2. **Rate limiting verification** — Once Upstash is connected, test that rate limits work
3. **CORS** — Verify API routes have proper CORS for your domains only
4. **SQL injection** — All Supabase queries use parameterized `.eq()` / `.insert()` (verify no raw SQL)
5. **Auth on all /app/ routes** — Verify every `/app/*` page checks session
6. **Bundle size** — Run `npx next build` and check First Load JS sizes
7. **Image optimization** — Ensure all images use `next/image`
8. **Lighthouse** — Run Lighthouse on homepage, target 90+ on all scores

---

## ARCHITECTURE REFERENCE

```
┌─────────────────────────────────────────────────┐
│                  PRODUCTION                       │
├─────────────────────────────────────────────────┤
│                                                   │
│  ┌─────────────┐    ┌──────────────┐             │
│  │  Vercel      │    │  Supabase    │             │
│  │  Next.js 16  │───▶│  PostgreSQL  │             │
│  │  App Router  │    │  Auth/RLS    │             │
│  │  14 Crons    │    └──────────────┘             │
│  └──────┬───────┘                                 │
│         │                                         │
│         │ VOICE_SERVER_URL                        │
│         ▼                                         │
│  ┌──────────────┐    ┌──────────────┐            │
│  │  Voice Server │    │  Twilio      │            │
│  │  FastAPI+GPU  │◀──▶│  Voice/SMS   │            │
│  │  Orpheus TTS  │    │  Webhooks    │            │
│  │  Whisper STT  │    └──────────────┘            │
│  └──────────────┘                                 │
│                                                   │
│  ┌──────────────┐    ┌──────────────┐            │
│  │  Stripe      │    │  Upstash     │            │
│  │  Billing     │    │  Redis       │            │
│  │  Webhooks    │    │  Rate Limits │            │
│  └──────────────┘    └──────────────┘            │
│                                                   │
│  ┌──────────────┐                                │
│  │  Resend      │                                │
│  │  Email       │                                │
│  └──────────────┘                                │
└─────────────────────────────────────────────────┘

Domains: recall-touch.com, www.recall-touch.com
DB Schema: revenue_operator
Supabase Project: ucjbsftixnnbmuodholg (us-east-2)
```

---

## KEY FILES

| Purpose | Path |
|---------|------|
| Voice provider factory | `src/lib/voice/index.ts` |
| Recall voice provider | `src/lib/voice/providers/recall-voice.ts` |
| Voice with fallback | `src/lib/voice/provider-with-fallback.ts` |
| Recall voices (30+) | `src/lib/constants/recall-voices.ts` |
| API validation helpers | `src/lib/api/validate.ts` |
| Cron safety wrapper | `src/lib/cron/run-safe.ts` |
| Error boundary component | `src/components/ErrorBoundary.tsx` |
| Error reporting | `src/lib/error-reporting.ts` |
| Activation wizard | `src/app/activate/ActivateWizard.tsx` |
| Agents page | `src/app/app/agents/AgentsPageClient.tsx` |
| Voice server (Python) | `services/voice-server/main.py` |
| Voice server Dockerfile | `services/voice-server/Dockerfile` |
| Fly.io config | `services/voice-server/fly.toml` |

---

*Generated by Cowork (Claude) — March 19, 2026*
