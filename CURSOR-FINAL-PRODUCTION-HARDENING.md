# CURSOR: Final Production Hardening — Recall Touch

> **Context**: This is the final production hardening pass. All code changes below have been validated against the actual codebase. Security fixes in priorities 1-3 have already been applied and will deploy with the next push. This prompt covers everything remaining to make the system fully production-ready.

---

## PRIORITY 1: Push Security Fixes & Redeploy (DONE BY CLAUDE — VERIFY)

The following security fixes have been applied to the codebase:

### 1a. Cron Auth Hardened (`src/lib/runtime/cron-auth.ts`)
- Removed trust of spoofable `x-vercel-cron` header
- Now requires `Bearer CRON_SECRET` in Authorization header (Vercel sends this automatically)
- Added timing-safe comparison to prevent timing attacks
- Fallback: accepts `?cron_secret=` query param

### 1b. Telnyx Webhook Verification Fixed (`src/lib/telephony/telnyx-webhooks.ts`)
- Removed bypass when `TELNYX_PUBLIC_KEY` is not set (now always rejects)
- Added `crypto.timingSafeEqual` for signature comparison
- Removed all `console.log/warn/error` leaking to stdout

### 1c. Console.log Removed from Webhook Handlers
- `src/app/api/webhooks/telnyx/voice/route.ts` — replaced with `log()` from `@/lib/logger`
- `src/app/api/webhooks/telnyx/inbound/route.ts` — replaced with `log()` from `@/lib/logger`

### 1d. Localhost Fallbacks Gated
- `src/app/api/agent/speak/route.ts` — throws in production if `VOICE_SERVER_URL` not set
- `src/app/api/agent/preview-voice/route.ts` — same
- `src/lib/voice/providers/recall-voice.ts` — same

### 1e. Rate Limiting Fail-Closed (`src/lib/rate-limit.ts`)
- In production: if Redis is unavailable, requests are DENIED (not allowed)
- In dev: still allows all when Redis not configured

### 1f. Voice Provider Uses Telnyx (`src/lib/voice/providers/recall-voice.ts`)
- `createOutboundCall` now uses `getTelephonyService()` abstraction
- No more raw Twilio API calls — uses the unified telephony layer
- Properly handles error responses from the telephony service

**Action**: Verify these changes compile, then `git add` and `git push origin main`.

---

## PRIORITY 2: Complete Telnyx Migration — Remaining Routes

These routes still reference Twilio directly and need to use `getTelephonyService()`:

### 2a. Phone Provisioning Route
**File**: Find any route that handles phone number purchase/search for workspaces
**Change**: Replace direct Twilio number API calls with `telephony.searchAvailableNumbers()` and `telephony.purchaseNumber()`

### 2b. Outbound Call Route (`src/app/api/outbound/call/route.ts`)
**Change**: If this route makes calls directly via Twilio SDK, replace with:
```typescript
import { getTelephonyService } from "@/lib/telephony";
const telephony = getTelephonyService();
const result = await telephony.createOutboundCall({ from, to, webhookUrl });
```

### 2c. Test Call Route (`src/app/api/agents/[id]/test-call/route.ts`)
**Change**: Same pattern — use `getTelephonyService().createOutboundCall()`

### 2d. Phone Verification
**Change**: If using Twilio Verify for phone verification, either:
- Switch to Telnyx Verify API
- Or keep Twilio Verify as a separate service (it's cheap and works well)

### 2e. Delivery Provider (`src/lib/delivery/provider.ts`)
**Change**: The `sendViaTwilio()` function should delegate to `getTelephonyService().sendSms()` so the provider env var controls everything centrally.

---

## PRIORITY 3: Database Performance Indexes

Run these migrations in Supabase to prevent slow queries as data grows:

```sql
-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_calls_workspace_created
  ON revenue_operator.calls (workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_contacts_workspace_phone
  ON revenue_operator.contacts (workspace_id, phone);

CREATE INDEX IF NOT EXISTS idx_contacts_workspace_email
  ON revenue_operator.contacts (workspace_id, email);

CREATE INDEX IF NOT EXISTS idx_outbound_messages_external_id
  ON revenue_operator.outbound_messages (external_id);

CREATE INDEX IF NOT EXISTS idx_call_sessions_external_meeting_id
  ON revenue_operator.call_sessions (external_meeting_id);

CREATE INDEX IF NOT EXISTS idx_agents_workspace_id
  ON revenue_operator.agents (workspace_id);

-- Composite index for lead lookup patterns
CREATE INDEX IF NOT EXISTS idx_contacts_workspace_status_created
  ON revenue_operator.contacts (workspace_id, status, created_at DESC);

-- Index for cron job queries (speed-to-lead, follow-ups)
CREATE INDEX IF NOT EXISTS idx_contacts_next_followup
  ON revenue_operator.contacts (next_followup_at)
  WHERE next_followup_at IS NOT NULL;
```

---

## PRIORITY 4: Rate Limit Critical Endpoints

Add rate limiting to these high-risk endpoints that currently have none:

```typescript
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

// Add to each route's handler:
const ip = getClientIp(req);
const rl = await checkRateLimit(`route-name:${ip}`, LIMIT, WINDOW_MS);
if (!rl.allowed) {
  return NextResponse.json({ error: "Too many requests" }, {
    status: 429,
    headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) }
  });
}
```

**Routes needing rate limits:**

| Route | Limit | Window | Why |
|-------|-------|--------|-----|
| `/api/agents/[id]/test-call` | 3/min | 60s | Expensive — triggers actual calls |
| `/api/outbound/call` | 10/min | 60s | Cost — triggers outbound calls |
| `/api/sms/send` | 20/min | 60s | Cost — sends SMS |
| `/api/auth/forgot-password` | 3/min | 60s | Abuse prevention |
| `/api/billing/checkout` | 5/min | 60s | Fraud prevention |

---

## PRIORITY 5: Git History Cleanup (Credential Rotation)

The file `.env.vercel.production` was committed to git history in earlier commits, exposing production credentials. While it's no longer tracked (gitignored now), the secrets exist in git history.

**Action**:
1. Rotate ALL exposed credentials on their respective platforms:
   - Supabase: Regenerate service role key and anon key
   - Anthropic: Rotate API key
   - Stripe: Rotate webhook secret and secret key
   - Resend: Rotate API key
   - Twilio: Rotate auth token
   - Generate new SESSION_SECRET, PUBLIC_VIEW_SALT
2. Update all rotated values in Vercel environment variables
3. Consider using `git filter-branch` or BFG Repo-Cleaner to purge `.env.vercel.production` from history
4. Force push the cleaned history (coordinate with team)

---

## PRIORITY 6: Polish User-Facing Experience

### 6a. Loading States
Verify all `/app/*` pages have proper loading skeletons. Check these key pages:
- `/app/page.tsx` (dashboard)
- `/app/calls/page.tsx`
- `/app/contacts/page.tsx`
- `/app/campaigns/page.tsx`

If any are missing `loading.tsx`, add them:
```typescript
export default function Loading() {
  return <div className="animate-pulse space-y-4 p-6">
    <div className="h-8 w-48 rounded bg-muted" />
    <div className="h-64 rounded bg-muted" />
  </div>;
}
```

### 6b. Empty States
Verify empty states show helpful CTAs (not just "No data"). Key pages:
- Contacts page when no contacts exist → "Import contacts" or "Add your first contact"
- Calls page when no calls → "Make your first test call"
- Campaigns page when no campaigns → "Create your first campaign"

### 6c. Mobile Responsiveness
Test all pages at 375px width. Common issues to check:
- Tables overflow horizontally → wrap in `overflow-x-auto`
- Sidebar doesn't collapse → use responsive hamburger menu
- Forms too wide → use `max-w-lg mx-auto` on mobile

---

## PRIORITY 7: Monitoring & Observability

### 7a. Sentry Error Tracking
Sentry is already installed (`@sentry/nextjs`). Verify:
- `sentry.client.config.ts` exists with correct DSN
- `sentry.server.config.ts` exists
- `sentry.edge.config.ts` exists
- Error boundaries call `Sentry.captureException()`

### 7b. Health Check Endpoint
Create `/api/health/route.ts`:
```typescript
export async function GET() {
  const checks = {
    database: false,
    voiceServer: false,
    redis: false,
  };

  // Check Supabase
  try {
    const db = getDb();
    await db.from("workspaces").select("id").limit(1);
    checks.database = true;
  } catch {}

  // Check Voice Server
  try {
    const res = await fetch(`${process.env.VOICE_SERVER_URL}/health`, { signal: AbortSignal.timeout(3000) });
    checks.voiceServer = res.ok;
  } catch {}

  // Check Redis
  try {
    const redis = new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN });
    await redis.ping();
    checks.redis = true;
  } catch {}

  const allHealthy = Object.values(checks).every(Boolean);
  return NextResponse.json({ status: allHealthy ? "healthy" : "degraded", checks }, { status: allHealthy ? 200 : 503 });
}
```

### 7c. Uptime Monitoring
Set up external monitoring (UptimeRobot, BetterUptime, or similar) to ping:
- `https://www.recall-touch.com/api/health` every 5 minutes
- `https://recall-voice.fly.dev/health` every 5 minutes
- Alert on any 5xx response

---

## PRIORITY 8: Pre-Launch Checklist

Before going live with real users, verify:

- [ ] All environment variables set in Vercel (30 currently — verify none are missing)
- [ ] Telnyx phone number purchased and assigned to the SIP connection
- [ ] Stripe webhook endpoint configured: `https://www.recall-touch.com/api/billing/webhook`
- [ ] Telnyx webhook URLs configured:
  - Voice: `https://www.recall-touch.com/api/webhooks/telnyx/voice`
  - SMS: `https://www.recall-touch.com/api/webhooks/telnyx/inbound`
- [ ] DNS records correct for `recall-touch.com` and `www.recall-touch.com`
- [ ] SSL certificate valid and auto-renewing
- [ ] Voice server (`recall-voice.fly.dev`) responding to `/health`
- [ ] Test end-to-end flow: signup → activate → configure agent → test call → receive call → verify recording
- [ ] Billing flow: create checkout → complete payment → verify subscription active
- [ ] Email delivery working: signup confirmation, password reset, trial reminders
- [ ] CRON_SECRET set in Vercel (done ✓)
- [ ] Rotate all credentials exposed in git history (Priority 5)
- [ ] Run `next build` locally to verify no TypeScript/build errors

---

## PRIORITY 9: Future Enhancements (Post-Launch)

These are not blockers but will improve the product:

1. **WebSocket-based call streaming**: Replace HTTP polling with WebSocket for real-time call audio in the dashboard
2. **Call recording playback**: Add audio player component for reviewing call recordings
3. **A/B testing for agent voices**: Allow testing different voices and measuring conversion rates
4. **Multi-language support**: The i18n infrastructure exists — add Spanish, French, Portuguese translations
5. **Zapier/Make integration**: Publish triggers and actions for workflow automation
6. **White-label support**: Allow enterprise customers to use their own domain and branding
7. **GPU voice server upgrade**: When ready, switch Fly.io to GPU instance for faster TTS:
   - Uncomment GPU config in `services/voice-server/deploy/fly.toml`
   - Switch to `Dockerfile` (CUDA) instead of `Dockerfile.cpu`
   - Expected cost: ~$150/month for a4000 GPU

---

## Environment Variables Reference (All 30)

**Required for core functionality:**
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
DATABASE_URL
SESSION_SECRET
CRON_SECRET
PUBLIC_VIEW_SALT
NEXT_PUBLIC_APP_URL=https://www.recall-touch.com
```

**Telephony (Telnyx):**
```
TELEPHONY_PROVIDER=telnyx
TELNYX_API_KEY
TELNYX_CONNECTION_ID
TELNYX_MESSAGING_PROFILE_ID
TELNYX_PUBLIC_KEY
```

**Voice:**
```
VOICE_SERVER_URL=https://recall-voice.fly.dev
DEFAULT_VOICE_ID
```

**Billing (Stripe):**
```
STRIPE_SECRET_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_SOLO_MONTH
STRIPE_PRICE_GROWTH_MONTH
STRIPE_PRICE_TEAM_MONTH
```

**Email (Resend):**
```
RESEND_API_KEY
```

**AI:**
```
ANTHROPIC_API_KEY
```

**Redis (Rate Limiting):**
```
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
```

**Integrations:**
```
GOOGLE_CALENDAR_CLIENT_ID
GOOGLE_CALENDAR_CLIENT_SECRET
```

**Legacy (keep for fallback):**
```
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
```
