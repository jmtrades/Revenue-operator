# Recall Touch — Production Fix Report

**Date:** March 21, 2026
**Session:** FIX IT FOR REAL pass — Phase 2 Critical Fixes
**TypeScript Status:** CLEAN (0 errors)

---

## What Was Fixed

### 1. Telnyx Inbound Call Pipeline (CRITICAL)

**Problem:** The Telnyx voice webhook handler (`/api/webhooks/telnyx/voice`) only logged events — it never answered incoming calls, never looked up workspaces, never created call sessions, and never connected the AI agent. Inbound calls to Telnyx numbers were completely non-functional.

**Fix:**
- Added full `call.initiated` handler for incoming calls:
  - Looks up workspace from `phone_configs` table by called number
  - Creates or finds a lead from the caller's phone number
  - Creates `call_sessions` row with workspace_id, lead_id, provider
  - Answers the call via Telnyx Call Control API (`answerCall()`)
  - Starts bidirectional audio streaming to the voice server (`startStreamingAudio()`)
- Added workspace lookup to `call.answered` handler with voice AI handoff (`handleInboundCall()`)
- Added `speakText()` function to telnyx-voice.ts for error messages
- Updated TelnyxWebhookPayload type with `direction` field
- Graceful handling when no workspace found (speaks error message + hangup)

**Files:** `src/app/api/webhooks/telnyx/voice/route.ts`, `src/lib/telephony/telnyx-voice.ts`, `src/lib/telephony/telnyx-webhooks.ts`

---

### 2. Sidebar Navigation — Missing 6+ Pages + No Logout

**Problem:** The app shell sidebar only showed 8 links. Pages like Agents, Leads, Knowledge, Follow-Ups, Billing, and Developer were completely inaccessible unless users typed the URL directly. There was also no way to log out of the app.

**Fix:**
- Reorganized sidebar into 4 logical groups: Main, Communication, Intelligence, Workspace
- Added missing pages: Agents (Bot icon), Leads (UserPlus), Knowledge (BookOpen), Follow-Ups (Clock), Billing (CreditCard), Developer (Code)
- Added Sign Out button with LogOut icon at sidebar bottom
- Sign out calls `supabase.auth.signOut()` then redirects to `/sign-in`
- Updated mobile "More" links to include all pages

**File:** `src/app/app/AppShellClient.tsx`

---

### 3. Outbound Calls — Workspace-Specific Phone Numbers

**Problem:** All outbound calls used a single global phone number from `process.env.TELNYX_PHONE_NUMBER`, regardless of which workspace initiated the call. Multi-tenant workspaces would all share one number.

**Fix:**
- `createOutboundCall()` in RecallVoiceProvider now queries `phone_configs` for the workspace's active `proxy_number`
- Falls back to env var only when no workspace phone is configured
- Imported `getDb` for database access

**File:** `src/lib/voice/providers/recall-voice.ts`

---

### 4. Stripe Billing Env Var Naming Mismatch

**Problem:** `stripe-prices.ts` expects `STRIPE_PRICE_BUSINESS_MONTH` and `STRIPE_PRICE_SCALE_MONTH`, but `env/validate.ts` and `.env.example` referenced `STRIPE_PRICE_GROWTH_MONTH` and `STRIPE_PRICE_TEAM_MONTH`. Tier names were inconsistent.

**Fix:**
- Updated `src/lib/env/validate.ts` to use `BUSINESS` and `SCALE` naming
- Updated `.env.example` to match the correct naming convention
- All Stripe price env vars now consistently use: SOLO, BUSINESS, SCALE, ENTERPRISE

**Files:** `src/lib/env/validate.ts`, `.env.example`

---

### 5. Marketing Page i18n — 80+ Hardcoded Strings

**Problem:** Hero, Features, FinalCTA, and Footer components had 80+ hardcoded English strings, making the marketing site non-translatable.

**Fix:**
- Added `marketing` namespace with 80+ keys to `en.json`
- Hero: badge, headings, descriptions, voice demo UI, compliance badges
- Features: section labels, feature titles and descriptions
- FinalCTA: heading, description, trust signals, form text
- Footer: industry names, product links, company links
- All other locales fall back to English automatically

**Files:** `src/i18n/messages/en.json`, `src/components/sections/Hero.tsx`, `src/components/sections/Features.tsx`, `src/components/sections/FinalCTA.tsx`, `src/components/sections/Footer.tsx`

---

## Cumulative Session Changes

Across both phases of this session, approximately **70+ files** were modified with **800+ lines of insertions** and **300+ deletions**.

### Phase 1 (Earlier in Session)
- Removed fake MRR data from admin dashboard
- Fixed knowledge base mock website fetch
- Created /sign-up redirect to /activate
- Added SEO metadata (OG, Twitter cards, canonical URLs)
- Fixed 9 API routes leaking error messages
- Migrated 55+ hardcoded colors to CSS custom properties across 20+ files
- Added AI guardrails (max call duration, forbidden phrases, after-hours awareness)
- Added phone number validation for agent transfer
- Fixed billing TypeScript errors
- Added voice cloning "Coming Soon" state
- Added CRM Beta badges
- Fixed contact timeline field name bugs
- Added real CSV import parsing for leads/contacts
- Added troubleshooting FAQ to help page
- Fixed duplicate onboarding flow
- Fixed team page placeholder member

### Phase 2 (This Continuation)
- Fixed Telnyx inbound call pipeline (answering, workspace lookup, session creation, audio streaming)
- Added 6 missing pages to sidebar + reorganized into groups
- Added logout/user menu
- Fixed outbound calls to use workspace-specific phone numbers
- Fixed Stripe env var naming consistency
- Fixed 80+ marketing page i18n hardcoded strings

---

## What Is Still Risky

1. **Telnyx inbound calls need real-phone testing** — the code is structurally correct and matches the working Twilio pattern, but no live call has been placed through it yet
2. **Voice server availability** — the streaming audio depends on `VOICE_SERVER_URL` being configured and reachable
3. **Stripe webhooks** — missing handlers for `invoice.finalized`, `charge.failed`, `charge.refunded`
4. **Trial period** — hardcoded to 14 days in two separate places
5. **CRM integrations** — all marked Beta, actual sync depth is limited
6. **Post-call processing** — follow-up sequence triggers after calls not yet wired

---

## What Must Be Checked Manually

1. **Make a real inbound call** to a Telnyx number and verify AI agent answers
2. **Make a real outbound call** and verify workspace-specific number is used as caller ID
3. **Complete the Stripe checkout flow** end-to-end with a test card
4. **Test sign-out** from both desktop sidebar and mobile
5. **Verify all sidebar links** navigate correctly (Agents, Leads, Knowledge, Follow-Ups, Billing, Developer)
6. **Test CSV import** with a real contacts file
7. **Test voice preview** on the settings/voices page
8. **Verify marketing pages** render correctly with translations

---

## Recommendation

The product is now structurally complete for a soft launch. The inbound call pipeline — which was the single biggest blocker — is implemented. Navigation is complete, billing is consistent, and the marketing site is translatable. The remaining risks are integration-level issues that require live environment testing with real Telnyx credentials, real Stripe webhooks, and real phone calls.

**Next steps before wider user rollout:**
1. Deploy and test inbound calls with real Telnyx numbers
2. Run a full Stripe checkout/subscription lifecycle test
3. Add the missing Stripe webhook handlers (charge.failed, charge.refunded)
4. Wire post-call follow-up sequence triggers
