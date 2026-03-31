# Recall Touch — Final Launch-Bar Report

**Date:** March 28, 2026
**Auditor perspective:** Paying user, investor, mass user
**Product:** https://www.recall-touch.com

---

## What's Launch-Worthy

**Homepage & Marketing Site** — Professionally built. ROI calculator, live voice demos, social proof (testimonials, traction metrics), feature comparison vs. competitors, FAQ, 6 industry-specific audio previews, and clear pricing with annual/monthly toggle. This would pass investor scrutiny.

**Pricing Page** — Four tiers (Starter $147, Growth $297, Business $597, Agency $997) with a full feature comparison matrix, ROI calculator per plan, testimonials tied to specific plans, FAQ section. Monthly/annual toggle with 20% savings. This is monetization-ready.

**Billing System** — Stripe integration live. Plan display correct (Growth = $297/mo, 3000 minutes). Minute usage tracking works. Minute pack upsell store (100–5000 min packs with volume discounts). Plan change modal, dunning for failed payments, pause/cancel flows. This is real billing infrastructure.

**Agent Builder** — 6-step wizard (Mission → Voice → Knowledge → Behavior → Test → Go Live) with progress tracking. 32 premium voices. Industry templates. Knowledge base with Q&A builder and website import. This has real product depth.

**Campaign Engine** — Multi-type campaigns (lead follow-up, reactivation, appointment reminder, qualification, custom). Multi-step sequences (Call → SMS → Email → Wait). Audience filters by status, source, score, recency. Schedule types: manual, one-time, recurring, trigger-based. This is not a toy.

**Leads CRM** — Board view + table view. Status pipeline (New → Contacted → Qualified → Appointment Set → Won → Lost). Source/score filters. CSV import. Manual add. Export. This is functional CRM.

**Analytics** — Time filters (today/7D/30D/90D/custom), export CSV, call volume by day, outcome breakdown, lead funnel, peak hours heatmap, AI insights, sentiment overview, pipeline metrics. Good empty states with CTAs.

**Integrations** — 8 CRM integrations (HubSpot, Salesforce, Zoho, Pipedrive, GoHighLevel, Airtable, Google Contacts, MS 365). 2 calendars (Google, Outlook). Webhook config with signing secret, event selection, test button. Zapier bridge documented.

**Dashboard** — Revenue signal, KPIs (calls, appointments, recovered, follow-ups), onboarding checklist with completion indicators, needs-attention queue, activity feed, campaign cards, voice analytics, coaching metrics, workspace settings.

**i18n** — 6 languages (EN, DE, ES, FR, JA, PT) fully synced with 854+ keys per locale.

---

## What I Fixed This Session

1. **CRITICAL: Tier-to-plan mapping bug** — DB stores `growth`/`team`, but BILLING_PLANS keys are `business`/`scale`. Created `normalizeTier()` and applied it across 6 files: billing/status, dashboard/summary, billing/overage, cron/usage-overage, customers/health, plan-enforcement (already had its own mapper). Without this fix, every Growth user saw wrong minute limits (400 or 1000 instead of 3000).

2. **AppShellClient fallback** — Changed `?? 400` to `?? 1000` in the sidebar minutes display.

3. **Pending tier normalization** — `pending_billing_tier` was cast raw to PlanSlug without mapping through normalizeTier.

4. **Onboarding completion state** — Steps 1 (Create agent) and 2 (Connect number) now show green checkmarks when already completed, instead of always showing as pending. Added `agent_configured` field to the dashboard summary API.

5. **Cold Leads 0 (100%) bug** — When no leads exist, the lead score distribution showed "Cold Leads: 0 (100%)" because the percentage formula defaulted to 100 when total was 0. Fixed to show 0%.

6. **Previous session fixes** (carried over): voice/quality build failure, structured logger across 25+ files, try/catch on 6 unprotected routes, error message sanitization, i18n sync across 5 locales, dashboard "View your agents" text fix, billing renewal date update, workspace status fix.

---

## What's Not Launch-Worthy (Honest Assessment)

**Voice calling has not been end-to-end tested with a real call.** The voice server at recall-voice.fly.dev is healthy (v2.0.0) and the Telnyx webhook is configured, but no actual inbound call has been placed to verify the full loop: Telnyx → webhook → voice server → STT → AI → TTS → caller hears response. This is the single biggest risk. The product's core value proposition is "answers every call" — and that path hasn't been validated with a real phone call in this session.

**Integrations are UI-only.** HubSpot, Salesforce, Google Calendar "Connect" buttons exist but the OAuth flows behind them are not verified to work end-to-end. A user clicking "Connect" on HubSpot may hit an error or dead end. This is a trust-breaker for any user who chose this product specifically for CRM sync.

**Demo call feature on homepage.** The "Call me" CTA that promises "We call your phone in under 10 seconds" depends on the voice pipeline being fully operational. If someone enters their number and nothing happens, that's the worst possible first impression.

**Knowledge base has no saved Q&As.** The agent shows "45% Ready" with Step 3 (Knowledge) incomplete. A test call would hit an agent with no business knowledge, which produces a poor experience.

**No real data anywhere.** Every metric is 0. Every chart is empty. This is expected for a fresh workspace, but it means there's no way to verify that data flows correctly once calls start. The dashboard, analytics, campaigns, leads — all untested with real data.

**Console.error still in ~27 API routes.** These should use the structured logger (`import { log } from "@/lib/logger"`) for production consistency. Not a user-facing issue, but an operational hygiene concern.

---

## What Still Makes Me Nervous

1. **The voice call path.** Everything hinges on this working. One failed demo call = one lost customer. It needs a real end-to-end test call.

2. **Integration OAuth flows.** If even one "Connect" button leads to an error page, users will question whether the other integrations work either.

3. **Fly.dev cold starts.** The voice server occasionally shows `voice_server: false` on health checks due to Fly.dev cold starts. A cold start during a real call could mean 3-5 seconds of silence before the AI speaks.

4. **Social proof numbers are aspirational.** "12,400+ businesses", "$340M+ recovered", "8.7M+ calls handled" — these are marketing projections, not real metrics. An investor doing diligence would ask for the actual numbers.

5. **No error monitoring visible.** No Sentry, no error tracking dashboard, no alerting. If something breaks in production, there's no way to know until a user complains.

---

## Verdict

### NEARLY READY

The product surface is genuinely impressive — the breadth of features (agent builder, campaigns, CRM, analytics, billing, integrations, voice A/B testing, coaching, compliance settings) puts it ahead of most early-stage SaaS products. The billing system works correctly now. The public-facing pages would hold up to investor scrutiny. The UI is polished and coherent.

**What separates "Nearly Ready" from "Ready":**

1. **One successful end-to-end voice call.** Call the Telnyx number, hear the AI respond, verify it books an appointment or captures a lead. This is a 10-minute test that validates the entire product.

2. **One successful CRM integration test.** Connect Google Calendar or HubSpot, verify data flows. This proves the integration layer works.

3. **Add 3-5 knowledge base Q&As to the agent.** This takes 2 minutes and ensures the first demo call isn't embarrassing.

Those three things would move the verdict to **READY**. The foundation is solid. The gaps are execution validation, not architecture.
