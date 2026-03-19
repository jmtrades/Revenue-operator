# Recall Touch — Cursor Implementation Prompt (Post-Migration)

## Context: What Was Just Completed

The codebase has been migrated to use Recall Touch's OWN voice system exclusively. All Vapi and ElevenLabs dependencies have been removed from active code paths. The `elevenlabs` npm package has been removed from package.json. All API routes, agent creation, onboarding, and settings pages now use the Recall voice provider.

### Current State (Verified Clean)
- TypeScript: Zero errors
- ESLint: Zero errors, zero warnings
- Vitest: 279 files, 1168 tests, all passing
- Next.js Build: Compiles successfully in 33.7s
- Voice Provider: Recall (self-hosted) is the sole active provider
- Onboarding: Consolidated to single `/activate` flow
- API Routes: Zod validation + rate limiting on critical endpoints

---

## PRIORITY 1: Database Schema Migration (voice_id column)

The code now writes `voice_id` instead of `elevenlabs_voice_id` to the agents table, but the database column may still be named `elevenlabs_voice_id`. Run this migration:

```sql
-- Add voice_id column if it doesn't exist
ALTER TABLE agents ADD COLUMN IF NOT EXISTS voice_id TEXT;

-- Backfill from elevenlabs_voice_id
UPDATE agents SET voice_id = elevenlabs_voice_id WHERE voice_id IS NULL AND elevenlabs_voice_id IS NOT NULL;

-- Keep elevenlabs_voice_id for backwards compatibility (don't drop yet)
```

Also check these tables for any vapi-specific columns that need migration:
- `agents` — `vapi_agent_id`, `vapi_assistant_id`, `elevenlabs_voice_id`
- `workspaces` — any vapi config fields
- `call_sessions` — any vapi-specific fields

**Do NOT drop columns yet.** Just add `voice_id` and stop writing to the old columns.

---

## PRIORITY 2: Deploy Voice Server to Fly.io

The self-hosted voice server lives at `services/voice-server/`. It needs to be deployed.

### Steps:
1. `cd services/voice-server`
2. `flyctl launch --name recall-voice --region iad`
3. Select GPU instance (A10G minimum for TTS inference)
4. Set environment variables in Fly.io dashboard
5. Set `VOICE_SERVER_URL=https://recall-voice.fly.dev` in Vercel env vars

### Required Env Vars for Voice Server:
- `OPENAI_API_KEY` (for Claude/LLM calls from voice agent)
- `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` (for phone integration)

### Required Env Vars in Vercel (Next.js app):
- `VOICE_SERVER_URL=https://recall-voice.fly.dev`
- `VOICE_PROVIDER=recall`
- `DEFAULT_VOICE_ID=us-female-warm-receptionist`

---

## PRIORITY 3: Set Up Upstash Redis for Rate Limiting

Rate limiting is wired in code but requires Redis credentials:

1. Create Upstash Redis instance at https://console.upstash.com
2. Add to Vercel env vars:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

Rate limits currently configured:
- `/api/outbound/call` — 60 requests/min per workspace
- `/api/sms/send` — 100 requests/min per workspace
- `/api/signup` — 5 requests/hour per IP
- `/api/auth/signin` — 10 requests/min per IP

---

## PRIORITY 4: Email Verification Enforcement

Users are currently active immediately without verifying email. The check exists in the app layout but doesn't block workspace creation.

### Implementation:
1. In `src/app/api/workspace/create/route.ts`, add a check:
```typescript
// After getSession()
if (!session.emailVerified) {
  return NextResponse.json({ error: "Please verify your email first" }, { status: 403 });
}
```

2. In `src/app/activate/ActivateWizard.tsx`, show a verification banner if email is unverified.

3. Add a resend-verification endpoint at `/api/auth/resend-verification`.

---

## PRIORITY 5: Trial Expiry Enforcement

`trial_ends_at` is stored in the workspaces table but no cron enforces it.

### Implementation:
Create `/src/app/api/cron/trial-expiry/route.ts`:
```typescript
// Runs daily via Vercel Cron
// 1. Query workspaces WHERE trial_ends_at < NOW() AND status = 'trialing'
// 2. Update status to 'trial_expired'
// 3. Send trial-expired email
// 4. Disable outbound calling for expired trials
```

Add to `vercel.json` crons:
```json
{ "path": "/api/cron/trial-expiry", "schedule": "0 6 * * *" }
```

---

## PRIORITY 6: Remaining UI Fixes

### A. Follow-ups Page
The follow-ups page at `/app/follow-ups` is still a stub. Either:
- Build it properly with sequence management UI
- Or hide it from the sidebar navigation until it's ready

### B. Agent Templates — voice_id References
In `src/lib/data/agent-templates.ts`, templates reference `elevenlabsVoiceId`. These should be updated to `voiceId` with Recall voice IDs:
- Replace ElevenLabs voice IDs (like "EXAVITQu4vr4xnSDxMaL") with Recall IDs (like "us-female-warm-receptionist")

### C. i18n Voice References
Search for "Vapi" and "ElevenLabs" in `src/i18n/messages/` translation files and update the text.

### D. Dashboard Components
These components in `src/components/dashboard/` have unused state setters that suggest they're stubs:
- `NeedsAttentionList.tsx`
- `RecentCallsList.tsx`
- `RevenueImpactCard.tsx`
- `TodaysActivity.tsx`

Either wire them to real data or replace with simpler placeholder cards.

---

## PRIORITY 7: Voice Server Health Monitoring

Add a health check endpoint that the Next.js app can ping:

### In `src/app/api/system/health/route.ts`:
Add a voice server health check that calls `VOICE_SERVER_URL/health` and reports status.

### In the admin dashboard (`/app/admin` or `/ops`):
Display voice server status (latency, uptime, active sessions).

---

## PRIORITY 8: Global Error Boundary

No React error boundary exists. Add one to prevent white-screen crashes.

### Create `src/app/error.tsx`:
```typescript
'use client';
export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h2>Something went wrong</h2>
      <p>{error.message}</p>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
```

Also add `src/app/app/error.tsx` for the authenticated app shell.

---

## PRIORITY 9: Social Proof

The homepage has ZERO testimonials and ZERO customer logos. This is the single biggest conversion barrier.

### When real testimonials are available:
1. Add them to `src/components/sections/Testimonials.tsx`
2. Add customer logos to `src/components/sections/TrustBar.tsx`
3. Add case study data to the results page

### In the meantime:
- Add industry-specific stat callouts (e.g., "Service businesses miss 62% of calls during working hours — Source: Ruby Receptionists")
- Add a "Trusted by X businesses" counter when data is available

---

## PRIORITY 10: Cron Job Audit

There are 90+ cron jobs defined. Many appear to be architectural placeholders. Audit and categorize:

### Active (keep):
- `speed-to-lead` — calls new leads within 60 seconds
- `monthly-billing` — processes Stripe billing
- `first-day-check` — sends check-in email

### Likely Dead Code (investigate and remove):
- `assumption-engine`, `proof-capsules`, `ritual-cycles`
- `shared-transaction-recovery`, `operational-continuity`
- Any job that queries tables that don't exist

### To Create:
- `trial-expiry` (Priority 5 above)
- `voice-quality-alert` — alert if voice server TTFB exceeds threshold

---

## Files Modified in This Session

### Voice Migration (40+ files):
- `src/lib/voice/index.ts` — Recall-only provider factory
- `src/lib/voice/types.ts` — Removed vapi/elevenlabs from union types
- `src/lib/voice/call-flow.ts` — Hardcoded deepgram-aura TTS
- `src/lib/voice/billing.ts` — Recall pricing only
- `src/lib/voice/human-voice-defaults.ts` — Recall reference
- `src/lib/voice/provider-with-fallback.ts` — Fallback to pipecat
- `src/lib/agents/sync-primary-agent.ts` — Removed Vapi sync
- `src/lib/agents/sync-vapi-agent.ts` — Deprecated (no-op)
- `src/lib/outbound/execute-lead-call.ts` — Uses voice provider abstraction
- `src/lib/voice-preview.ts` — Recall TTS endpoint
- `src/lib/env-check.ts` — VOICE_SERVER_URL required
- `src/lib/env/validate.ts` — Recall env checks
- `src/lib/readiness.ts` — recall_agent_id check
- `src/app/api/vapi/*` — All deprecated (410 Gone)
- `src/app/api/agent/speak/route.ts` — Recall TTS
- `src/app/api/agent/preview-voice/route.ts` — Recall TTS
- `src/app/api/agent/voices/route.ts` — Recall voice library
- `src/app/api/agents/route.ts` — No more vapi_agent_id creation
- `src/app/api/agents/[id]/test-call/route.ts` — Recall provider
- `src/app/api/workspace/agent/route.ts` — voiceId field
- `src/app/api/workspace/create/route.ts` — voiceId field
- `src/app/api/admin/stats/route.ts` — Voice server health
- `src/app/activate/ActivateWizard.tsx` — Recall voices
- `src/app/activate/steps/types.ts` — voiceId instead of elevenlabsVoiceId
- `src/app/activate/steps/CustomizeStep.tsx` — Recall voices
- `src/app/app/agents/AgentsPageClient.tsx` — Full migration
- `src/app/app/agents/page.tsx` — voice_id column
- `src/app/app/settings/agent/page.tsx` — Recall voices
- `src/app/admin/page.tsx` — Voice Server health display
- `src/components/sections/CompetitorComparison.tsx` — Removed Vapi mention
- `package.json` — Removed elevenlabs dependency
- `.env.example` — Recall-only env config

### Onboarding Consolidation (14 files):
- Auth callback, signup APIs, email templates, settings pages, OnboardingChecklist
- All now point to `/activate` as the single entry

### API Hardening (6 files):
- `src/lib/api/validate.ts` — Shared Zod schemas
- Outbound call, contacts, SMS, signup, workspace create — all validated

### Lint Cleanup (20+ files):
- All unused imports/variables fixed
