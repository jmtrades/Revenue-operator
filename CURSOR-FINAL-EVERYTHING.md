# CURSOR MASTER PROMPT — Make Recall Touch Fully Perfect

> **Product**: Recall Touch — AI Revenue Operations Platform
> **Stack**: Next.js 16.1.6 (Turbopack), Supabase PostgreSQL, Vercel, Telnyx (telephony), Fly.io (voice server), Upstash Redis, Stripe
> **Domain**: recall-touch.com | Voice Server: recall-voice.fly.dev
> **Telephony**: Telnyx is PRIMARY. Twilio is LEGACY fallback only.
> **Voice**: Self-hosted Recall voice server (Kokoro TTS, Faster-Whisper STT)
> **Database Schema**: `revenue_operator` — tables are `leads` (NOT "contacts"), `call_sessions` (NOT "calls"), `agents`, `workspaces`, `outbound_messages`
> **Generated**: 2026-03-20 — Updated with live testing findings

Execute every priority below in order. Do NOT skip anything. After each priority, verify it compiles (`npx tsc --noEmit` or `next build`). Commit after each priority.

---

## ✅ ALREADY DONE (Do NOT redo these)

### Database Performance Indexes — APPLIED DIRECTLY TO PRODUCTION DB
These 8 indexes have already been created on the Supabase production database:
```sql
idx_call_sessions_workspace_started ON call_sessions (workspace_id, started_at DESC)
idx_leads_workspace_phone ON leads (workspace_id, phone)
idx_leads_workspace_email ON leads (workspace_id, email)
idx_call_sessions_external_meeting_id ON call_sessions (external_meeting_id)
idx_agents_workspace_id ON agents (workspace_id)
idx_leads_workspace_state_created ON leads (workspace_id, state, created_at DESC)
idx_call_sessions_lead_id ON call_sessions (lead_id)
idx_workspaces_owner_id ON workspaces (owner_id)
```

### i18n Pricing Tier Key Fix — APPLIED TO LOCAL FILES
In all 5 non-English locale files (es, fr, de, pt, ja), the `homepage.pricingPreview` section had mismatched tier keys:
- `tierRoi.starter` → renamed to `tierRoi.solo`
- `tierRoi.growth` → renamed to `tierRoi.business`
- `tiers.starter` → renamed to `tiers.solo`
- `tiers.growth` → renamed to `tiers.business`
This fixes the raw translation keys showing on the homepage pricing section.

### Security Fixes — DEPLOYED (commits 435e109, 101c9c1, 24f2b48)
- Cron auth hardened (timing-safe Bearer CRON_SECRET)
- Telnyx webhook verification fixed (no bypass, timingSafeEqual)
- Console.log purged from webhook handlers
- Localhost fallbacks gated (throw in production)
- Rate limiting fail-closed in production
- Voice provider uses unified telephony abstraction

### Telnyx Environment Variables — SET IN VERCEL
These 5 env vars have been added to Vercel:
- `TELNYX_API_KEY`
- `TELNYX_CONNECTION_ID`
- `TELNYX_MESSAGING_PROFILE_ID`
- `TELNYX_PUBLIC_KEY`
- `TELEPHONY_PROVIDER=telnyx`

---

## PRIORITY 1: Push i18n Fix & Verify

The i18n pricing tier key fixes are in local files but not yet committed/pushed.

```bash
git add src/i18n/messages/es.json src/i18n/messages/fr.json src/i18n/messages/de.json src/i18n/messages/pt.json src/i18n/messages/ja.json
git commit -m "fix(i18n): rename pricing tier keys starter→solo, growth→business in all locales

The PricingPreview component uses TIER_ROI_KEYS mapping Solo→solo and
Business→business, but non-English locales used starter/growth keys
causing raw translation key display on the homepage pricing section.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
git push origin main
```

**Verify**: After deploy, check homepage pricing section shows translated tier names (not raw keys like `homepage.pricingPreview.tiers.solo.name`).

---

## PRIORITY 2: Add Missing Annual Stripe Prices

**Problem**: Health check shows `stripe: "partial"` — all 3 annual price env vars are missing.

**Action**: Create annual Stripe prices in Stripe Dashboard, then add to Vercel:
- `STRIPE_PRICE_SOLO_YEAR` — Solo annual plan price ID
- `STRIPE_PRICE_GROWTH_YEAR` — Growth annual plan price ID
- `STRIPE_PRICE_TEAM_YEAR` — Team annual plan price ID

If annual pricing isn't ready yet, update the PricingPreview toggle to hide the annual option until prices are configured:
```typescript
// In PricingPreview.tsx — only show annual toggle if prices exist
const hasAnnualPrices = PRICING_TIERS.some(t => t.priceAnnual && t.priceAnnual !== t.priceMonthly);
```

---

## PRIORITY 3: Fix Environment Variable Validation

**File**: `src/lib/env-check.ts`

The env checker currently marks `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` as required. Since we've switched to Telnyx as the primary provider, update the validation:

**Changes**:
1. Make `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` optional (warn if missing, don't error)
2. Add `TELNYX_API_KEY` as required
3. Add `TELNYX_CONNECTION_ID` as required
4. Add `TELNYX_MESSAGING_PROFILE_ID` as required
5. Add `TELNYX_PUBLIC_KEY` as required
6. Add `TELEPHONY_PROVIDER` as required (must be "telnyx" or "twilio")
7. Add `CRON_SECRET` as required
8. Keep `VOICE_SERVER_URL` as required

---

## PRIORITY 4: Complete Telnyx Migration — Remaining Direct Twilio Calls

These files still make direct HTTP calls to Twilio API. Replace with `getTelephonyService()`:

### 4a. `src/app/api/sms/send/route.ts`
This route already uses `getTelephonyProvider()` to decide but still has direct Twilio HTTP calls as fallback. Replace the Twilio branch with:
```typescript
import { getTelephonyService } from "@/lib/telephony";
const telephony = getTelephonyService();
const result = await telephony.sendSms({ from, to, text });
```

### 4b. `src/app/api/phone/provision/route.ts`
Has both Twilio and Telnyx paths. Replace the Twilio number search/purchase with:
```typescript
const telephony = getTelephonyService();
const available = await telephony.searchAvailableNumbers({ areaCode, state, limit: 5 });
const purchased = await telephony.purchaseNumber(selectedNumber);
```

### 4c. `src/app/api/integrations/twilio/auto-provision/route.ts`
This auto-provisions a phone number for new workspaces. Update to use the unified service:
```typescript
const telephony = getTelephonyService();
const numbers = await telephony.searchAvailableNumbers({ areaCode, limit: 1 });
if (!("error" in numbers) && numbers.length > 0) {
  const result = await telephony.purchaseNumber(numbers[0].phone_number, {
    connectionId: process.env.TELNYX_CONNECTION_ID,
    messagingProfileId: process.env.TELNYX_MESSAGING_PROFILE_ID,
  });
}
```

### 4d. `src/lib/delivery/provider.ts`
The `sendViaTwilio()` function still uses direct Twilio HTTP. Replace with:
```typescript
async function sendViaTwilio(phone: string, text: string, workspacePhone: string) {
  const { getTelephonyService } = await import("@/lib/telephony");
  const telephony = getTelephonyService();
  return telephony.sendSms({ from: workspacePhone, to: phone, text });
}
```

### 4e. Stripe webhook number release (`src/app/api/billing/webhook/route.ts`)
When a subscription is deleted, the webhook releases numbers. Update the release logic to use:
```typescript
const telephony = getTelephonyService();
await telephony.releaseNumber(numberId);
```

---

## PRIORITY 5: Rate Limit All High-Risk Endpoints

Add rate limiting to these endpoints:

### Pattern:
```typescript
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const ip = getClientIp(req);
const rl = await checkRateLimit(`endpoint-name:${ip}`, LIMIT, WINDOW_MS);
if (!rl.allowed) {
  return NextResponse.json(
    { error: "Too many requests" },
    { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
  );
}
```

### Endpoints:

| File | Key | Limit | Window | Reason |
|------|-----|-------|--------|--------|
| `src/app/api/agents/[id]/test-call/route.ts` | `test-call:${workspaceId}` | 3 | 60s | Expensive calls |
| `src/app/api/auth/forgot-password/route.ts` | `forgot-pw:${ip}` | 3 | 300s | Abuse prevention |
| `src/app/api/billing/checkout/route.ts` | `checkout:${workspaceId}` | 5 | 60s | Fraud prevention |
| `src/app/api/auth/signin/route.ts` | `signin:${ip}` | 10 | 60s | Brute force |
| `src/app/api/call-intelligence/analyze/route.ts` | `analyze:${workspaceId}` | 10 | 60s | AI cost control |
| `src/app/api/knowledge/upload/route.ts` | `upload:${workspaceId}` | 10 | 60s | Storage abuse |
| `src/app/api/agents/route.ts` (POST) | `create-agent:${workspaceId}` | 10 | 60s | Resource limits |

---

## PRIORITY 6: PII Redaction for Call Intelligence

**File**: `src/app/api/call-intelligence/analyze/route.ts`

Add PII sanitization BEFORE sending transcripts to Claude:

```typescript
function redactPII(text: string): string {
  return text
    .replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{1,7}\b/g, "[REDACTED-CC]")
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[REDACTED-SSN]")
    .replace(/\brouting\s*(?:number|#|num)?\s*:?\s*\d{9}\b/gi, "[REDACTED-ROUTING]")
    .replace(/\baccount\s*(?:number|#|num)?\s*:?\s*\d{8,17}\b/gi, "[REDACTED-ACCOUNT]");
}

// Use before sending:
const sanitizedTranscript = redactPII(transcript);
```

---

## PRIORITY 7: Enhanced Health Check

**File**: `src/app/api/health/route.ts`

Replace or enhance to check ALL services:

```typescript
export async function GET() {
  const checks: Record<string, boolean> = {};
  const start = Date.now();

  // Database
  try {
    const db = getDb();
    const { error } = await db.from("workspaces").select("id").limit(1);
    checks.database = !error;
  } catch { checks.database = false; }

  // Voice Server
  try {
    const res = await fetch(`${process.env.VOICE_SERVER_URL}/health`, {
      signal: AbortSignal.timeout(3000)
    });
    checks.voice_server = res.ok;
  } catch { checks.voice_server = false; }

  // Redis
  try {
    const { checkRateLimit } = await import("@/lib/rate-limit");
    const result = await checkRateLimit("health-check-ping", 1000, 60000);
    checks.redis = result.allowed;
  } catch { checks.redis = false; }

  // Telnyx
  try {
    const res = await fetch("https://api.telnyx.com/v2/balance", {
      headers: { Authorization: `Bearer ${process.env.TELNYX_API_KEY}` },
      signal: AbortSignal.timeout(3000),
    });
    checks.telnyx = res.ok;
  } catch { checks.telnyx = false; }

  const allHealthy = Object.values(checks).every(Boolean);

  return NextResponse.json({
    status: allHealthy ? "healthy" : "degraded",
    checks,
    latencyMs: Date.now() - start,
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "dev",
  }, { status: allHealthy ? 200 : 503 });
}
```

---

## PRIORITY 8: Complete Knowledge Upload

**File**: `src/app/api/knowledge/upload/route.ts`

The upload reads files but discards content. Complete it:
1. Extract text (PDF via `pdf-parse`, DOCX via `mammoth`, TXT directly)
2. Store in `knowledge_documents` table
3. Chunk for future RAG (512 tokens, 50 overlap)

Migration (run in Supabase SQL Editor):
```sql
CREATE TABLE IF NOT EXISTS revenue_operator.knowledge_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES revenue_operator.workspaces(id),
  filename TEXT NOT NULL,
  file_type TEXT NOT NULL,
  content_text TEXT,
  chunk_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS revenue_operator.knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES revenue_operator.knowledge_documents(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  token_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_knowledge_chunks_workspace ON revenue_operator.knowledge_chunks(workspace_id);
CREATE INDEX idx_knowledge_docs_workspace ON revenue_operator.knowledge_documents(workspace_id);
```

---

## PRIORITY 9: UI/UX Polish

### 9a. Loading States
Add `loading.tsx` to every app page that's missing one:
- `/app/page.tsx`, `/app/calls/page.tsx`, `/app/contacts/page.tsx`
- `/app/campaigns/page.tsx`, `/app/settings/page.tsx`
- `/app/agents/page.tsx`, `/app/analytics/page.tsx`

### 9b. Empty States
Every data page needs helpful empty states with CTAs:
- **Leads**: "Import contacts or add manually" + [Import CSV] [Add Contact]
- **Call Sessions**: "Make your first test call" + [Test Call]
- **Campaigns**: "Create your first campaign" + [Create Campaign]
- **Agents**: "Create your first AI agent" + [Create Agent]
- **Analytics**: "Analytics appear after your first calls"

### 9c. Mobile (375px)
- Wrap tables in `overflow-x-auto`
- Single-column forms on mobile
- Sidebar collapse with hamburger

### 9d. Toast Notifications
All mutations show success/error toasts via `sonner` or your toast lib.

---

## PRIORITY 10: Buy Telnyx Phone Number

**MANUAL STEP** (do in Telnyx Portal):
1. Telnyx dashboard → Numbers → Search & Buy → US local number
2. Assign to your SIP connection (find the ID in Telnyx → SIP Connections)
3. Assign to your SMS messaging profile (find the ID in Telnyx → Messaging → Profiles)
4. Add `TELNYX_PHONE_NUMBER=+1XXXXXXXXXX` to Vercel env vars

---

## PRIORITY 11: End-to-End Testing

- [ ] Signup → verify email → /activate → configure → go live
- [ ] Signin at `/sign-in` → dashboard loads
- [ ] Create agent → select voice → preview plays
- [ ] Add lead → send SMS → delivered
- [ ] Test call → phone rings → AI responds
- [ ] Upgrade → Stripe checkout → subscription active
- [ ] Health endpoint: `curl https://www.recall-touch.com/api/health`
- [ ] Voice health: `curl https://recall-voice.fly.dev/health`

---

## PRIORITY 12: Credential Rotation

`.env.vercel.production` was in git history. Rotate ALL credentials:
1. Supabase keys (service role + anon)
2. Anthropic API key
3. Stripe keys + webhook secret
4. Resend API key
5. SESSION_SECRET + PUBLIC_VIEW_SALT

Update in Vercel → Redeploy → Verify.

Then clean git history:
```bash
pip install git-filter-repo
git filter-repo --invert-paths --path .env.vercel.production
git push --force
```

---

## PRIORITY 13: Monitoring

- Verify Sentry is configured (`sentry.client.config.ts`, `sentry.server.config.ts`)
- Set up uptime monitoring for `/api/health` and voice server
- Alert email: jmtrades1990@gmail.com

---

## PRIORITY 14: Performance

- Cache read-only endpoints (voice list, presets): `s-maxage=300`
- Review dashboard queries for N+1 patterns
- Check `next build` output — dynamic import anything over 200KB

---

## PRIORITY 15: Final Deploy

```bash
npx tsc --noEmit && next build
git add -A
git commit -m "feat: complete production hardening — fully operational

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
git push origin main
```

Verify: site loads, health returns "healthy", signup works, voice plays, crons run.

---

## IMPORTANT: Database Schema Reference

The actual table names in `revenue_operator` schema (verified against production DB):

| Prompt references | Actual table name | Key columns |
|---|---|---|
| "contacts" | `leads` | id, workspace_id, phone, email, name, company, state, created_at, qualification_score |
| "calls" | `call_sessions` | id, workspace_id, lead_id, started_at, ended_at, transcript, summary, outcome, external_meeting_id |
| "agents" | `agents` | id, workspace_id |
| "workspaces" | `workspaces` | id, owner_id, status, billing_status, billing_tier, stripe_customer_id |
| "outbound_messages" | `outbound_messages` | id, workspace_id, lead_id, content, channel, status, sent_at (NO external_id column) |

**IMPORTANT**: The `leads` table uses `state` (NOT `status`) for lead status. There is NO `next_followup_at` column on leads.
