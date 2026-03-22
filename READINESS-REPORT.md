# Recall Touch — Production Readiness Report

**Date:** 2026-03-22
**Baseline commit:** 3e72c85 (main)
**Pending changes:** 31 files (20 modified, 11 new) — NOT pushed
**DB migration:** `add_agent_control_center_columns_v2` — APPLIED to production Supabase

---

## 1. READINESS SUMMARY

### Fully Implemented (verified via code audit + TSC clean)

- **i18n system** — 1,455+ keys added to en.json, synced to all 6 locales; all new components use `useTranslations()`
- **Dashboard KPIs** — inbound/outbound breakdown, missed calls recovered, qualified leads, conversion rate, phone config status
- **Goal-first onboarding** — GoalStep with 6 goals, multi-select, wired into ActivateWizard as step 1
- **Agent Control Center** — 4 collapsible sections (Behavior/Qualification, Escalation/Transfer, Actions, Objections) with full UI + DB columns migrated
- **Voice system** — Tier badges (Free/Growth+/Business+/Agency), 3-level preview fallback (voice server → demo API → browser TTS), human-like defaults applied
- **Number marketplace** — Confirmation dialog before provisioning, auto-search on country change with debounce, mobile number type, loading skeletons, error states with retry
- **Integrations** — Health widget (CRM + Calendar status), Sync Now button per CRM with progress feedback, widget imported on integrations page
- **Pipeline analytics** — PipelineFunnel with proportional bars + leakage highlighting, OperationsSummary with 4 KPIs, integrated into analytics page
- **Settings checklist** — ReadinessChecklist component + `/api/workspace/readiness` endpoint, rendered on settings page
- **Visual polish** — EmptyState with role="region" + aria-label, SkipToContent component in root layout, focus-visible outlines, prefers-reduced-motion in globals.css
- **Telemetry** — 10 event types via PostHog (server + client), 5 alert thresholds with severity levels, `/api/monitoring/health` endpoint checking DB + voice server + telephony
- **DB schema** — 3 prior migrations (conversations.workspace_id, outbound_messages timestamps, sequence_runs.updated_at) + 10 new agent control center columns

### Partially Implemented

- **Onboarding resume** — businessName persists to localStorage; step position does NOT persist (always resets to step 1)
- **Homepage hero demo** — Phone validation accepts 7-15 digits; NO country code dropdown selector; NO confirmation step before demo call fires
- **Voice preview** — Fallback chain is voice server → demo API → browser TTS; does NOT explicitly try Deepgram as intermediate (demo API may proxy to Deepgram internally)
- **Google Calendar OAuth** — Existing flow works (OAuth2 + CSRF via HMAC state); no new fix was applied because the flow was already functional

### Not Implemented

- **Welcome email on signup** — No email trigger in onboarding or workspace creation
- **Per-campaign/list objective configuration** — Agent control center is workspace-level only, not per-campaign
- **Connect-integrations step content** — Onboarding step 3 ("Connect") has no integrations OAuth inline
- **Voice metrics dashboard** — No per-voice performance analytics (call satisfaction, conversion by voice)
- **CRM sync progress bar** — Sync Now triggers and shows toast, but no real-time progress percentage

### Risks

| Risk | Severity | Why |
|------|----------|-----|
| Agent settings SELECT includes new columns | **High if not deployed together** | The GET handler in `/api/workspace/agent` selects all 10 new columns. If code deploys before DB migration, the endpoint 500s. Migration is already applied, so deploy code ASAP. |
| Voice server dependency | **Medium** | Preview fallback works, but if NEXT_PUBLIC_VOICE_SERVER_URL is unset, first attempt shows error toast before falling through. User sees brief error flash. |
| Pipeline API assumes lead states | **Low** | PipelineFunnel hardcodes 5 states (new/contacted/qualified/appointment_set/won). Leads in other states are silently dropped from funnel. |
| PostHog not installed | **Low** | Telemetry gracefully falls back to console.debug if PostHog SDK not present. Events are lost silently in production until PostHog is configured. |

---

## 2. END-TO-END TEST MATRIX

| # | Flow | Steps | Expected Result | Failure Mode | Telemetry Event | Alert Threshold |
|---|------|-------|-----------------|--------------|-----------------|-----------------|
| 1 | **Home demo call** | Visit `/`, enter phone, click "Try it now" | POST `/api/demo/call` returns 200, callStatus shows success | 4xx: invalid phone; 5xx: Telnyx down → `callError` displayed | `demo_call_initiated` | — |
| 2 | **Signup** | Click "Start Free Trial" → `/activate` | Redirects to auth → lands on GoalStep (step 1) | Auth redirect loop if Supabase auth misconfigured | `signup_started` | — |
| 3 | **Onboarding goals** | Select 1+ goals → Continue | Advances to step 2 (Phone); goals persisted in wizard state | Button disabled if 0 goals; state lost on full page refresh | `onboarding_step_completed` | — |
| 4 | **Get number** | Settings → Phone → Marketplace → search → select → confirm | Number provisioned via Telnyx, success state with "Go to settings" link | Telnyx API error → error banner with retry; empty results → "No numbers found" message | `phone_number_provisioned` | — |
| 5 | **Voice preview** | Settings → Voices → click Play on any voice card | Audio plays via voice server, Deepgram, or browser TTS | All 3 fail → toast "Voice preview unavailable" | `voice_preview_played` | voice_preview_failure_rate > 50% |
| 6 | **Voice select + save** | Click voice card → selection persists | PATCH `/api/workspace/agent` with voiceId | Network error → console error, selection not persisted | `voice_selected` | — |
| 7 | **Integration connect** | Settings → Integrations → click Connect on HubSpot | OAuth redirect → callback → card shows "Connected" with sync badge | OAuth error → redirect with `?crm=error`; missing env vars → 500 | `integration_connected` | — |
| 8 | **CRM Sync Now** | Click "Sync Now" on connected CRM card | POST batch-sync → toast "{n} leads enqueued" → status refresh | Endpoint 500 → toast error; no leads → "0 leads enqueued" | `crm_sync_triggered` | — |
| 9 | **Pipeline dashboard** | Analytics → scroll to Pipeline & Operations | Funnel renders 5 stages with counts; leakage point highlighted in red | No leads → "No pipeline data available"; API error → error message in card | `analytics_viewed` | — |
| 10 | **Agent objective save** | Settings → Agent → expand Behavior → change qualification → Save | PATCH `/api/workspace/agent` returns 200; toast "Settings saved" | Missing DB columns → 500 (mitigated: migration applied) | `agent_settings_updated` | — |
| 11 | **Readiness checklist** | Settings page → view top widget | 6 checks rendered with pass/fail; "Ready" or "Action needed" badge | API 500 → empty checklist with loading skeleton | — | — |
| 12 | **Health endpoint** | GET `/api/monitoring/health` | JSON with db/voice/telephony status; 200 if all healthy, 503 if degraded | Individual check timeout (3s) → that check marked unhealthy | — | api_error_rate > 5% |

---

## 3. MANUAL ACCEPTANCE DEMO

**Prereqs:** Logged into recall-touch.com as workspace owner. Chrome DevTools Network tab open.

### Quick-pass (10 minutes)

| Step | Action | Expected | Screenshot/Log |
|------|--------|----------|----------------|
| A | Visit `recall-touch.com` | Hero shows "Your AI Phone Team" (or updated positioning), no raw i18n keys visible anywhere | Screenshot homepage |
| B | Switch locale to `es` via settings or cookie `rt_locale=es` | All UI text switches to Spanish/fallback English; no `dotted.key.strings` | Screenshot any page in es |
| C | Navigate to `/activate` (logged in) | GoalStep shows 6 goal cards; Continue button disabled until ≥1 selected | Screenshot step 1 |
| D | Select "Recover missed calls" + "Book appointments" → Continue | Advances to step 2 | — |
| E | Navigate to `/app/settings` | ReadinessChecklist widget visible at top with pass/fail indicators | Screenshot settings |
| F | Navigate to `/app/settings/voices` | Voice cards show tier badges (Free/Growth+/etc.); click Play on any voice | Screenshot voice page; confirm audio plays or toast appears |
| G | Navigate to `/app/settings/agent` | 4 collapsible sections visible; expand "Behavior & Qualification" → change to BANT → Save | Screenshot expanded section; Network tab shows PATCH 200 |
| H | Navigate to `/app/settings/phone/marketplace` | Country dropdown present; select "US" → results auto-load; click a number → confirmation dialog appears | Screenshot confirmation dialog |
| I | Navigate to `/app/settings/integrations` | IntegrationsHealthWidget at top; CRM cards show Sync Now buttons for connected providers | Screenshot integrations page |
| J | Navigate to `/app/analytics` | Scroll down — Pipeline Funnel section visible with stage bars; Operations Summary with 4 metric cards | Screenshot analytics pipeline section |
| K | Hit `/api/monitoring/health` in browser | JSON response with `status: "healthy"` or `"degraded"`, individual check results | Copy JSON response |

### What constitutes FAIL

- Any page showing raw translation keys like `dashboard.kpi.calls` instead of English text
- Any page returning 500 (check Network tab)
- Agent settings PATCH returning error (means DB migration didn't apply)
- TypeScript compilation errors on `npx tsc --noEmit`
- Voice preview showing no fallback (no audio AND no toast)

---

## 4. BLOCKERS LIST

| # | Blocker | Owner | Effort | Acceptance Criteria |
|---|---------|-------|--------|---------------------|
| 1 | **Code must deploy before DB migration window closes** | DevOps | 5 min | The 10 new `workspaces` columns are live in Supabase. If older code (without the new SELECT columns) runs, it still works (Supabase ignores extra columns). But the new agent settings page will 500 if deployed to a DB without the columns. Current state: migration applied, code not pushed. **Push and deploy now.** |
| 2 | **PostHog SDK not verified in production** | DevOps | 15 min | Run `grep -r "NEXT_PUBLIC_POSTHOG" .env*` to confirm PostHog keys are set. If missing, telemetry silently drops. Set `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST` in Vercel env vars. Acceptance: `/api/monitoring/health` returns 200 and events appear in PostHog dashboard. |
| 3 | **NEXT_PUBLIC_VOICE_SERVER_URL env var** | DevOps | 5 min | Verify this is set in Vercel production env. If unset, voice preview shows error toast on first attempt before falling through to browser TTS. Acceptance: voice preview plays audio on first click without error flash. |

### Not blockers (post-launch improvements)

- Country code selector on homepage demo (cosmetic — validation works)
- Demo call confirmation step (low risk — demo calls are free)
- Welcome email (marketing concern, not functional)
- Onboarding step resume (minor UX — wizard is short)
- Per-campaign agent objectives (v2 feature)
- Voice metrics dashboard (v2 feature)

---

**Bottom line:** 3 env-var/deploy items to verify, then ship. Everything else is post-launch polish.
