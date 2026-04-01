# Phase 2: Integration Reality Check — Findings Report

**Date:** 2026-04-01
**Auditor:** Zero-Trust Mass-Readiness Mandate
**Environment:** Production (recall-touch.com)
**Workspace:** 027ac617-5ab8-4e26-bcb3-1a2f5ad6bef9

---

## Executive Summary

Phase 2 investigated whether the four core integrations (CRM, Calendar, Phone/SMS, Voice/AI) and webhook delivery actually work end-to-end in production — not just render UI. **Verdict: none of them are fully operational.** The platform renders beautiful integration pages but the backend execution layer has critical gaps.

| Integration | Status | Severity |
|---|---|---|
| CRM (Google Contacts) | **BROKEN** — 17 sync jobs stuck, token expired, cron never processes queue | P0 |
| Google Calendar | **PARTIALLY WORKING** — token auto-refreshes, but 0 calendar sessions recorded | P1 |
| Phone/SMS (Telnyx) | **PARTIALLY WORKING** — phone active, 0 SMS ever sent, provider mismatch | P1 |
| Voice/AI Calling | **COSMETIC ONLY** — 0 voice models, 0 calls for main workspace, 8 demo calls on secondary workspace | P1 |
| Webhooks (Zapier) | **CONFIGURED BUT NEVER FIRED** — 1 webhook config, 0 deliveries ever | P2 |

---

## Finding 1: CRM Sync Queue Completely Blocked (P0 — CRITICAL)

### Evidence

- **17 outbound sync jobs** stuck in `sync_queue` with `status='pending'`, `attempts=0`, no errors
- Jobs created between 2026-03-30 03:55 and 2026-03-31 22:28
- The `process-sync-queue` cron sub-route produces **zero log output** despite being called every 2 minutes by `/api/cron/core`
- `sync_log` table: **0 entries** (no sync has ever completed or failed)
- `workspace_integrations` table: **empty** (no provider-level records)
- `integration_configs` table: **empty** (no field mapping configs)

### Root Cause Analysis

**Primary suspect: RLS policy mismatch on sync_queue and sync_log tables.**

Both tables had RLS policies with `roles: {service_role}` instead of the standard pattern used by all other tables (`roles: {public}` with `qual: auth.role() = 'service_role'`). This different policy form may cause PostgREST to behave differently depending on how the Supabase JS client sets the role claim.

**RLS fix applied:** Replaced both policies with the standard pattern:
```sql
DROP POLICY "service_role_full_access" ON revenue_operator.sync_queue;
CREATE POLICY "sync_queue_service_all" ON revenue_operator.sync_queue
  FOR ALL TO public USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Same for sync_log
```

**Secondary issue: Google Contacts OAuth token expired.**
- Token expired: 2026-03-30 07:09 UTC (2 days ago)
- `token_error`: null (no refresh was ever attempted)
- `status`: still shows `active`
- The token refresh code in `src/lib/integrations/token-refresh.ts` is well-written but was never triggered because `processSyncJob()` was never reached

**Verification needed:**
- After the RLS fix, monitor next cron cycles to see if jobs are processed
- If still blocked, the `public.sync_queue` table (different schema with `next_attempt_at` vs `next_retry_at`) may be shadowing the revenue_operator version via PostgREST
- If jobs process, the token refresh should auto-trigger and either succeed (if GOOGLE_CLIENT_ID/SECRET are set) or fail with a logged error

### Impact

- No leads have ever been synced to Google Contacts despite the integration being "connected"
- Users see "Active" status in the UI but zero data has moved
- 17 leads are silently queued and forgotten

---

## Finding 2: Google Calendar — Token Works, Zero Sessions (P1)

### Evidence

- Token `expires_at`: 2026-04-01 12:46 UTC (auto-refreshing correctly)
- Token `updated_at`: 2026-04-01 11:46 UTC (refreshed 1 hour before expiry — working)
- `calendar_sessions` table: **0 entries**
- No calendar bookings, no appointment records

### Assessment

The OAuth connection is healthy — token auto-refreshes every hour. But no calendar sessions have been created, meaning:
- No appointments have been booked through the platform
- The booking flow may not be triggering session creation
- OR no leads have reached the booking stage yet (which is plausible given CRM sync is broken)

### Action Items

- Verify the booking API endpoint creates `calendar_sessions` records
- Test a manual booking to confirm the end-to-end flow works
- Check if the Google Calendar API is actually reading available slots

---

## Finding 3: Phone/SMS — Active Number, Zero SMS, Provider Mismatch (P1)

### Evidence

**Phone Numbers:**
- Main workspace: +16293342183 (Telnyx, active, SMS+Voice capable)
- Phone config: `mode: proxy`, no forwarding number set, no Twilio SIDs

**Secondary workspace (3effd287):**
- Different number: +18504679287 (mode: `ai_agent`)
- Has Twilio account SID and phone SID configured
- All 8 call sessions belong to THIS workspace, not the main one

**SMS:**
- `sms_messages` table: **0 entries** across ALL workspaces
- No SMS has ever been sent or received through the platform

**Call Sessions (all on secondary workspace):**
- 8 calls, all `inbound`, all `completed`, all provider=`twilio`
- Duration: 1-13 seconds (very short — likely test calls)
- All have `null` for: outcome, quality_score, cost_cents, stt_model, tts_model, llm_model
- All have `null` for lead_id (no lead association)

### Issues

1. **Provider mismatch**: Phone number is Telnyx but all calls used Twilio — on a different workspace
2. **Zero SMS**: Despite SMS capability being active, no messages have been sent
3. **No forwarding**: `forwarding_number` is null — inbound calls have nowhere to route in proxy mode
4. **No lead association**: All 8 calls have `lead_id: null` — no CRM linkage
5. **No AI models used**: stt/tts/llm models are all null — calls were answered but not processed by AI

### Action Items

- Configure forwarding_number for the main workspace's phone config
- Test SMS send via `/api/sms/send` endpoint
- Verify Telnyx webhook URLs are correctly configured in Telnyx Dashboard
- Investigate why calls on secondary workspace used Twilio instead of Telnyx

---

## Finding 4: Voice/AI Calling — No Voice Models, No Real Calls (P1)

### Evidence

- `voice_models` table: **0 entries** (no AI voice personas configured)
- `voice_ab_tests`: 0
- `voice_consents`: 0
- `voice_quality_logs`: 0
- `voice_usage`: 0
- `voice_health_checks`: **3,589 entries** — running every 5 minutes, all healthy
  - Latest: 2026-04-01 12:05 UTC, ok=true, latency=49ms
  - Consistent 30-70ms latency, 0 active conversations

### Assessment

The voice infrastructure is **healthy but empty**:
- Health checks prove the voice server is reachable and responsive
- But no voice models exist — meaning AI calling cannot function
- No voice consent records — TCPA compliance not triggered because no calls happened
- The 8 call sessions on the secondary workspace had no AI processing (null models)

### Action Items

- Create at least one voice model for the main workspace
- Configure voice persona (greeting, personality, objection handling)
- Test outbound AI call flow
- Verify voice server URL is correctly set in environment

---

## Finding 5: Webhooks — Configured, Never Delivered (P2)

### Evidence

- `webhook_configs`: 1 config exists
  - Endpoint: Zapier catch hook
  - Events: lead_qualified, call_booked, deal_at_risk, deal_won, lead_reactivated
  - Enabled: true
  - Max attempts: 5
  - Created: 2026-03-18

- `webhook_deliveries`: **0 entries**
- No webhook has ever fired

### Assessment

The webhook is correctly configured and enabled, but has never been triggered because:
- No leads have been qualified (CRM sync broken)
- No calls have been booked (calendar sessions = 0)
- No deals have been won or lost
- No leads have been reactivated

This is a downstream effect of the upstream integration failures.

### Action Items

- Fix CRM sync (Finding 1) — webhook events should start firing
- Verify the Zapier endpoint is still active (hooks can expire)
- Test webhook delivery manually via API

---

## Broader RLS Issue (P1 — Systemic)

During the CRM investigation, a sweep of ALL tables in the `revenue_operator` schema revealed:

- **Tables with RLS enabled but NO policies at all**: ~100+ tables (return 0 rows for everyone)
- **Tables with `{service_role}` only policies**: ~50+ tables (may have same issue as sync_queue)
- **Tables with correct `{public}` role + `auth.role()` check**: Core tables (leads, workspace_crm_connections, etc.)

The no-policy tables are mostly operational/internal tables that may only be written to by server-side code. But if any of them are READ by the app via the Supabase JS client, they'd return empty results silently.

**Recommendation**: Audit all tables with RLS enabled but missing/incorrect policies. Apply the standard pattern to any table accessed by the application.

---

## Action Priority Matrix

| Priority | Action | Effort | Impact |
|---|---|---|---|
| P0 | Monitor sync_queue after RLS fix; if still blocked, investigate PostgREST schema exposure | Low | Unblocks all CRM sync |
| P0 | Verify GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET env vars are set | Low | Enables token refresh |
| P1 | Configure voice model for main workspace | Medium | Enables AI calling |
| P1 | Set forwarding_number on main workspace phone config | Low | Enables call routing |
| P1 | Test SMS send end-to-end via Telnyx | Low | Validates SMS capability |
| P1 | Audit RLS policies across all revenue_operator tables | Medium | Prevents silent data loss |
| P2 | Test Zapier webhook delivery manually | Low | Validates automation pipeline |
| P2 | Investigate Twilio vs Telnyx provider mismatch | Medium | Clarifies telephony architecture |

---

## RLS Fix Applied This Session

```sql
-- sync_queue: old policy (service_role only) → new policy (public with auth.role() check)
DROP POLICY "service_role_full_access" ON revenue_operator.sync_queue;
CREATE POLICY "sync_queue_service_all" ON revenue_operator.sync_queue
  FOR ALL TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- sync_log: same fix
DROP POLICY "service_role_full_access" ON revenue_operator.sync_log;
CREATE POLICY "sync_log_service_all" ON revenue_operator.sync_log
  FOR ALL TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
```

**Status**: Applied directly to production database. No code deployment needed.
