# RECALL TOUCH — CURSOR IMPLEMENTATION PROMPT

You are the engineering team for Recall Touch. This document tells you exactly what to build, exactly what to fix, exactly what to change, and exactly how. Every file path is real. Every type definition is verified. Every code reference matches the actual codebase (529 tests pass, 0 TypeScript errors as of March 18, 2026).

**Read this entire document. Execute in the exact order listed. Do not improvise. Do not add features not listed. Do not skip steps.**

---

## IDENTITY

**What Recall Touch is:** The AI Revenue Operations platform. Answers every inbound call, runs outbound campaigns, executes multi-step follow-up sequences across voice + SMS + email, books appointments, recovers no-shows, reactivates dead leads, chases quotes, and measures every dollar recovered — automatically.

**Category:** AI Revenue Operations. NOT a receptionist. NOT an answering service. NOT a phone system.

**Two engines:** Inbound (AI answers every call 24/7) + Outbound (AI initiates calls, runs 10 campaign types, follows up proactively). The outbound engine is the differentiator.

**Three modes:** Solo (self-employed), Sales (SDR teams), Business (service businesses — default).

---

## TECH STACK (Do not change. Do not introduce alternatives.)

Next.js 16.1.6 App Router · React 19.2.3 · TypeScript 5 · Tailwind CSS 4 (globals.css @theme, NOT tailwind.config.js) · Supabase PostgreSQL + RLS · Stripe 20.3.1 · Framer Motion 12.35.2 · Lucide React 0.575.0 · Recharts 3.8.0 · @xyflow/react 12.10.1 · @dnd-kit · next-intl 4.8.3 · Resend (email) · PostHog (analytics) · Sentry 10.44.0 (errors) · Sonner 2.0.7 (toasts) · Zod 4.3.6 (validation) · date-fns 4.1.0

**Forms:** Native React state + Zod. react-hook-form is NOT in this codebase. Do not introduce it.

**CSS Variables (source of truth: src/app/globals.css):**
- `--bg-primary: #FAFAF8` · `--bg-surface: #FFFFFF` · `--bg-hover: #F3F4F6` · `--bg-inset: #F9FAFB`
- `--accent-primary: #0D6E6E` · `--accent-secondary: #16A34A` · `--accent-warning: #F59E0B` · `--accent-danger: #DC2626`
- `--text-primary: #1A1A1A` · `--text-secondary: #6B7280` · `--text-tertiary: #9CA3AF`
- `--border-default: #E5E7EB` · `--border-active: #0D6E6E`
- `--card-radius: 16px` · `--radius-btn: 12px`

**Fonts:** DM Sans (`--font-body-sans`), Playfair Display (`--font-serif`), Geist Mono, JetBrains Mono.

**CRITICAL RULE:** Marketing pages (/, /pricing, /demo, /industries/*, /compare/*) use dark backgrounds via .marketing-section CSS overrides. App pages (/app/*) use the LIGHT theme from :root variables. Never use zinc-900, black/30, or dark backgrounds in /app/*.

---

## PRICING (Source of truth: src/lib/billing-plans.ts)

| Plan | Monthly | Annual | Minutes | Overage | Agents | Seats | Daily Outbound | SMS Cap |
|------|---------|--------|---------|---------|--------|-------|---------------|---------|
| Solo | $49 | $39/mo | 100 | $0.30/min | 1 | 1 | 10 | 500 |
| Business | $297 | $247/mo | 500 | $0.20/min | 3 | 5 | 100 | 2,000 |
| Scale | $997 | $847/mo | 3,000 | $0.12/min | 10 | ∞ | 500 | 10,000 |
| Enterprise | Custom | Custom | ∞ | Negotiated | ∞ | ∞ | ∞ | ∞ |

All prices in billing-plans.ts are CENTS (4900 = $49.00). billing-plans.ts is the SINGLE source of truth. Never hardcode tier data elsewhere.

---

## PHASE 1: IMMEDIATE FIXES (Do these first, in order)

### Fix 1: HeroRevenueWidget dark-theme classes

**File:** `src/components/sections/HeroRevenueWidget.tsx`

The `toneStyles` object on ~lines 52-56 uses hardcoded dark-theme classes. Replace:

```typescript
// REPLACE THIS:
const toneStyles: Record<HeroKpi["tone"], { border: string; fg: string; bg: string }> = {
  lead: { border: "border-zinc-700", fg: "text-blue-400", bg: "bg-zinc-900/60" },
  appointment: { border: "border-zinc-700", fg: "text-green-400", bg: "bg-zinc-900/60" },
  followup: { border: "border-zinc-700", fg: "text-amber-300", bg: "bg-zinc-900/60" },
};

// WITH THIS:
const toneStyles: Record<HeroKpi["tone"], { border: string; fg: string; bg: string }> = {
  lead: { border: "border-[var(--border-default)]", fg: "text-blue-600", bg: "bg-blue-50" },
  appointment: { border: "border-[var(--border-default)]", fg: "text-emerald-600", bg: "bg-emerald-50" },
  followup: { border: "border-[var(--border-default)]", fg: "text-amber-600", bg: "bg-amber-50" },
};
```

Also in the same file, find and replace these hardcoded classes:
- `bg-white/[0.06]` → `bg-[var(--bg-inset)]`
- `bg-white/[0.18]` → `bg-[var(--accent-primary)]/20`
- `text-white/80` → `text-[var(--text-primary)]`
- `hover:text-white` → `hover:text-[var(--accent-primary)]`

This makes the HeroRevenueWidget work correctly in the light-themed hero card.

### Fix 2: Homepage section reorder

**File:** `src/app/page.tsx`

Move the ROI Calculator to after ProblemStatement and before HowItWorks. Current order in the JSX return:

```
Hero → ProblemStatement → HowItWorks → HomepageRoiCalculator → Industries → Features → PricingPreview → FinalCTA → Footer
```

Change to:

```
Hero → ProblemStatement → HomepageRoiCalculator → HowItWorks → Industries → Features → PricingPreview → FinalCTA → Footer
```

Simply swap the `<HomepageRoiCalculator />` and `<HowItWorks />` component positions in the JSX.

**Why:** When a visitor sees they're losing $4,200/month (Problem Statement), the ROI Calculator immediately below shows they could recover $2,940. This creates urgency BEFORE explaining how it works.

### Fix 3: UnifiedDashboard progress bar color

**File:** `src/components/dashboard/UnifiedDashboard.tsx`

On ~line 192, the progress bar uses `bg-white` for the normal state. Replace:

```
bg-white
```

With:

```
bg-[var(--accent-primary)]
```

So the full conditional becomes: `pctMin >= 100 ? "bg-red-500" : pctMin >= 80 ? "bg-amber-500" : "bg-[var(--accent-primary)]"`

### Fix 4: FAQ JSON-LD sync

**File:** `src/app/page.tsx`

In the FAQ JSON-LD schema (the `<script type="application/ld+json">` block inside the `HomePage` component), verify that question 3 says "How is this different from an AI receptionist?" — NOT "What does 'Revenue Execution OS' mean?" If it still has the old text, update it to match the HomepageFAQ.tsx component exactly:

```json
{
  "@type": "Question",
  "name": "How is this different from an AI receptionist?",
  "acceptedAnswer": {
    "@type": "Answer",
    "text": "An AI receptionist answers calls and takes messages. Recall Touch answers calls AND runs automated follow-up sequences until the revenue is recovered — no-show recovery, reactivation campaigns, quote chasing, and proof of ROI in your dashboard. The follow-up is what pays for itself."
  }
}
```

---

## PHASE 2: SELF-HOSTED VOICE STACK

This is the highest-impact cost reduction. Current voice costs $0.099/min from outsourced vendors. Self-hosted drops to $0.007/min. 93% cost reduction. 98%+ gross margins.

### 2.1 Create the voice service directory structure

```
services/
└── voice/
    ├── pipecat-server.py          # Main Pipecat pipeline orchestration
    ├── requirements.txt           # Python dependencies
    ├── Dockerfile                 # Multi-model GPU container
    ├── docker-compose.yml         # Full stack orchestration
    ├── .env.example               # Required environment variables
    ├── agents/
    │   ├── base_agent.py          # Shared agent behavior
    │   ├── inbound_agent.py       # Default inbound call handler
    │   ├── outbound_agent.py      # Outbound campaign caller
    │   ├── appointment_setter.py  # Booking-focused agent
    │   ├── after_hours.py         # After-hours handler
    │   └── prompts/               # System prompt templates per agent type
    │       ├── inbound.txt
    │       ├── outbound.txt
    │       ├── appointment.txt
    │       └── after_hours.txt
    ├── tts/
    │   ├── kokoro_service.py      # Kokoro 82M TTS gRPC service
    │   ├── fish_speech_service.py # Fish Speech S1-mini for voice cloning (Business+)
    │   └── voices/                # Speaker embedding configs
    │       ├── professional_female.json
    │       ├── professional_male.json
    │       ├── warm_female.json
    │       ├── warm_male.json
    │       ├── neutral.json
    │       └── energetic.json
    ├── stt/
    │   └── canary_service.py      # Canary-1B-Flash streaming STT service
    ├── llm/
    │   ├── llama_service.py       # Llama 3.3 8B via vLLM (INT8 quantized)
    │   └── confidence_router.py   # Routes 90% to Llama, 10% to Claude fallback
    └── telephony/
        └── telnyx_handler.py      # Telnyx SIP trunk connection
```

### 2.2 Pipecat Pipeline Server (pipecat-server.py)

The main orchestration server. Handles the full voice pipeline:

```
Telnyx SIP Inbound → Pipecat → [Canary STT → Llama 3.3 8B → Kokoro TTS] → Telnyx SIP Audio Out
```

**Dependencies (requirements.txt):**
```
pipecat-ai[daily,google,silero]>=0.0.80
vllm>=0.6.0
kokoro>=0.1.0
faster-whisper>=1.0.0  # fallback if Canary unavailable
telnyx>=2.0.0
grpcio>=1.60.0
anthropic>=0.40.0  # Claude fallback
```

**Key behaviors:**
- Answer inbound calls within 3 seconds
- Use agent-specific system prompts from `agents/prompts/`
- Route LLM inference: Llama 3.3 8B handles 90% of turns. If confidence score < 0.85 on the Llama response, retry with Claude Haiku API as fallback.
- TTS uses Kokoro 82M with workspace-specific voice preset
- STT uses Canary-1B-Flash in streaming mode
- All call events (answered, intent detected, booking made, transfer initiated) are POSTed to the Next.js API at `/api/voice/events` for logging to the contact timeline

**Docker deployment:** Single container on RunPod with GPU access. All three models (Kokoro 82M ~2GB + Canary 1B ~4GB + Llama 8B INT8 ~8GB = ~14GB total) fit on one RTX 4090 (24GB VRAM).

### 2.3 Confidence Router (llm/confidence_router.py)

```python
class ConfidenceRouter:
    """Routes 90% of LLM calls to self-hosted Llama, 10% to Claude fallback."""

    CONFIDENCE_THRESHOLD = 0.85

    async def generate(self, messages, agent_config):
        # Try Llama first
        response = await self.llama_client.generate(messages, agent_config)

        # Check confidence (based on logprob of top token)
        if response.confidence >= self.CONFIDENCE_THRESHOLD:
            return response

        # Fallback to Claude Haiku for complex conversations
        return await self.claude_client.generate(messages, agent_config)
```

### 2.4 Telnyx Migration

**Replace in codebase:**
- All `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` env vars → `TELNYX_API_KEY` / `TELNYX_SIP_TRUNK_ID`
- All Twilio SDK calls in `src/lib/telephony/` → Telnyx SDK equivalents
- Twilio webhook endpoints → Telnyx webhook format
- SMS sending: Twilio → Telnyx Messaging API ($0.004/segment vs $0.0079)

**Phone number porting:** Telnyx supports number porting from Twilio. Zero downtime. Keep existing customer numbers.

### 2.5 Cost Summary After Full Migration

| Component | Cost/Min |
|-----------|---------|
| Pipecat (open source) | $0.000 |
| Kokoro 82M TTS (self-hosted) | $0.00012 |
| Canary-1B-Flash STT (self-hosted) | $0.000006 |
| Llama 3.3 8B (90%) + Claude fallback (10%) | $0.004 |
| Telnyx telephony | $0.004 |
| **Total** | **$0.008/min** |

GPU: 1× RTX 4090 on RunPod at $0.34/hr ($245/mo). Supports ~500 Business customers.

**Margins:** Solo 98.4% · Business 98.7% · Scale 97.6%

### 2.6 Phased Rollout (Each phase ships independently)

| Phase | Week | Change | Result |
|-------|------|--------|--------|
| 1 | Current | Vapi + Deepgram + Claude + Twilio | $0.099/min |
| 2 | Week 1–2 | Replace Vapi → Pipecat | $0.064/min |
| 3 | Week 2–3 | Replace Deepgram TTS → Kokoro | $0.049/min |
| 4 | Week 3–4 | Replace Deepgram STT → Canary | $0.034/min |
| 5 | Week 4–5 | Replace Claude → Llama 8B (with fallback) | $0.012/min |
| 6 | Week 5–6 | Replace Twilio → Telnyx | $0.008/min |

**Quality gate per phase:** A/B test 50 calls on self-hosted vs outsourced. Measure: answer latency (<3s), transcription accuracy (WER ≤7%), voice naturalness (caller stay rate), booking completion rate. Only roll out when metrics match or exceed baseline.

---

## PHASE 3: NEW PAGES & FEATURES

### 3.1 Create /results page

**File:** `src/app/results/page.tsx`

This is the #1 conversion blocker. Prospects need proof the system works.

**Structure:**
- Hero: "Real Results from Real Businesses"
- If no customers yet: "We're onboarding our first customers now. Here's what the system is designed to deliver:" followed by projected metrics based on industry averages from the ProblemStatement data (HVAC: $46,800/yr, Dental: $54,600/yr, Legal: $208,000/yr).
- Template for future case studies: business name, industry, before (missed calls/month, estimated loss), after (calls answered, revenue recovered, follow-ups sent), timeline, quote.
- CTA: "Start Your Free Trial"

### 3.2 Create /security page

**File:** `src/app/security/page.tsx`

**Structure:**
- Hero: "Enterprise-Grade Security for Your Business Communications"
- Sections: Data Encryption (HMAC-SHA256 sessions, HTTPS everywhere), Access Control (RLS policies, workspace isolation), Rate Limiting (Upstash Redis, per-endpoint), Call Recording (encrypted storage, access-controlled), Compliance (TCPA compliance for outbound, per-contact suppression, DNC registry checks, configurable consent statements), Monitoring (Sentry error tracking, PostHog analytics, 13 active health crons), Data Handling (30-day retention after cancellation, export available on request).
- CTA: "Questions about security? Contact us."

### 3.3 Create /outbound page

**File:** `src/app/outbound/page.tsx`

**Structure:**
- Hero: "Outbound That Actually Works — Without the Manual Grind"
- Sections: 10 Campaign Types (with icons and descriptions from campaigns/create), Sequence Builder (screenshot or mockup), Compliance Built In (suppression rules, business hours, DNC), Setter Workflows (AI calls → qualifies → books with human closer), Analytics (conversion rates, contact rates, pipeline value).
- CTA: "Start Outbound Campaigns — Free for 14 Days"

### 3.4 Expand Industries section

**File:** `src/components/sections/Industries.tsx`

Currently shows 5 industries + custom. Expand to 8 industries + custom:

Add: **HVAC** (already exists as plumbing-hvac), **Roofing**, **Med Spa** (separate from healthcare), **Recruiting**.

Each card: icon, industry name, 1-line pain point, link to /industries/[slug].

### 3.5 Add product tour (first login)

**File:** `src/components/ui/ProductTour.tsx` (new)

On first login (check localStorage key `rt_tour_completed`):
1. Highlight Dashboard revenue metric → "This is your Revenue Recovered — the money your AI has brought back."
2. Highlight Needs Attention queue → "These contacts need your attention. Click to call or follow up."
3. Highlight Campaigns in sidebar → "Create outbound campaigns to proactively chase revenue."
4. Highlight Settings → "Configure your agent's voice, behavior, and escalation rules here."
5. Final: "You're set! Your AI is answering calls 24/7."

Use a lightweight tooltip implementation. Each step: backdrop overlay + highlighted element + tooltip with text + Next/Skip buttons. Store completion in localStorage.

Import and render in `src/app/app/layout.tsx` inside the provider tree.

---

## PHASE 4: BILLING HARDENING

### 4.1 Dunning emails for failed payments

**File:** `src/app/api/webhooks/stripe/route.ts`

Handle these Stripe webhook events:
- `invoice.payment_failed` → Send email via Resend: "Your payment failed. Please update your payment method to continue service."
- After 3 failures → Send email: "Your account will be paused in 48 hours unless payment is updated."
- After 4 failures → Pause workspace. Set `workspace.status = 'paused'`. Show banner in dashboard: "Your account is paused due to a billing issue. [Update Payment →]"

### 4.2 Trial grace period

When trial expires (day 14): Don't immediately cut service. Set `workspace.status = 'grace'` for 3 days. Show banner: "Your trial has ended. [Upgrade to continue →]". Calls still answered during grace. On day 17: Set `workspace.status = 'expired'`. Stop answering calls. Send reactivation email.

### 4.3 Cancellation flow

**File:** `src/app/app/settings/billing/cancel/page.tsx` (new)

Steps:
1. "We're sorry to see you go. What's the main reason?" — Radio options: Too expensive, Not using it enough, Missing features, Switching to competitor, Other.
2. Save offer: "Stay and get 1 month free." Button: "Accept offer" / "Continue cancellation"
3. If continuing: "Your data will be retained for 30 days. You can export your contacts before leaving." Button: "Export Contacts" / "Cancel Subscription"
4. Confirmation screen: "Your subscription has been cancelled. Service continues until [end of billing period]."

Track cancellation reason in PostHog: `subscription_cancelled` with `reason` property.

---

## PHASE 5: ANALYTICS & TRACKING

### 5.1 PostHog events to add

In the relevant components/routes, add `track()` calls for these events:

```typescript
import { track } from '@/lib/analytics/posthog';

// Signup funnel
track('signup_started');
track('signup_completed', { plan: 'business' });

// Onboarding
track('onboarding_step_completed', { step: 1, name: 'industry' });
track('onboarding_step_completed', { step: 2, name: 'phone_number' });
track('onboarding_step_completed', { step: 3, name: 'voice' });
track('onboarding_step_completed', { step: 4, name: 'hours' });
track('onboarding_step_completed', { step: 5, name: 'test_call' });

// Activation milestones
track('first_call_received');
track('first_appointment_booked');
track('first_revenue_attributed', { amount_cents: number });
track('trial_day_7_active');

// Billing
track('upgrade_clicked', { from: 'solo', to: 'business' });
track('plan_changed', { action: 'upgrade', plan: 'scale' });
track('subscription_cancelled', { reason: string });

// Features
track('campaign_created', { type: 'speed_to_lead' });
track('campaign_launched', { contacts: number });
track('contact_imported', { count: number, source: 'csv' });
track('sequence_created', { trigger: 'call_outcome:no_answer' });

// Sidebar navigation (first use)
track('feature_first_use', { feature: 'campaigns' });
track('feature_first_use', { feature: 'follow_ups' });
track('feature_first_use', { feature: 'analytics' });
```

---

## PHASE 6: SEO COMPLETENESS

### 6.1 Create missing pages

Each page needs: unique `<title>`, `<meta description>`, H1, 800+ words of unique content, internal links to /pricing + /demo + relevant industry pages, JSON-LD schema where applicable.

**Priority pages to create:**
1. `/outbound` — "AI Outbound Campaigns" (described above)
2. `/security` — "Security & Compliance" (described above)
3. `/results` — "Results & Case Studies" (described above)
4. `/industries/roofing/page.tsx` — dedicated page
5. `/industries/med-spa/page.tsx` — dedicated page (separate from healthcare)
6. `/industries/recruiting/page.tsx` — dedicated page
7. `/enterprise/page.tsx` — "AI Revenue Operations for Enterprise" with SSO, SLA, white-label details

### 6.2 Blog expansion

Create 10 initial blog posts targeting long-tail keywords:
1. "How Much Revenue Do Dental Offices Lose to Missed Calls?"
2. "AI vs Human Receptionist: The Real Cost Comparison"
3. "What Is AI Revenue Operations? The Complete Guide"
4. "Automated No-Show Recovery for Service Businesses"
5. "Speed to Lead: Why Response Time Determines Revenue"
6. "HVAC Companies: How to Answer Every Call Without Hiring"
7. "Legal Intake Automation: Capture Every Potential Client"
8. "How to Calculate Your Missed Call Revenue Leak"
9. "Recall Touch vs Smith.ai: Which Is Right for Your Business?"
10. "The Follow-Up Playbook: Why 80% of Revenue Is in the Second Touch"

Each post: 1,500+ words, 3–5 internal links, 1 CTA to /activate, FAQ section at bottom.

---

## APP ARCHITECTURE REFERENCE

### Sidebar (9 items — do not add more)

1. /app/dashboard (LayoutList) · 2. /app/calls (PhoneCall) · 3. /app/contacts (Users) · 4. /app/inbox (MessageSquare) · 5. /app/calendar (Calendar) · 6. /app/follow-ups (ListOrdered) · 7. /app/campaigns (Megaphone) · 8. /app/analytics (BarChart3) · 9. /app/settings (Settings)

Mobile: 3-tab bottom nav (Dashboard, Calls, Inbox) + More overflow.

### Dashboard (UnifiedDashboard.tsx)

Summary type:
```typescript
{
  revenue_recovered_cents: number;
  revenue_trend_pct: number;
  calls_answered: number;
  appointments_booked: number;
  follow_ups_sent: number;
  minutes_used: number;
  minutes_limit: number;
  needs_attention: { id: string; name: string; reason: string; phone?: string | null }[];
  activity: { id: string; at: string; line: string }[];
  campaigns: { id: string; name: string; status: string; enrolled: number; booked: number }[];
}
```

Already uses CSS variables for all styling. Only fix needed: progress bar color (Fix 3 above).

### Campaign Create (10 types)

speed_to_lead · lead_qualification · appointment_setting · appointment_reminder · no_show_recovery · reactivation · quote_chase · review_request · cold_outreach · custom

5-step wizard: Type → Audience → Sequence → Schedule → Review.

### Follow-Up Creator (8 triggers)

call_outcome:lead_captured · call_outcome:voicemail_left · call_outcome:no_answer · call_outcome:booked · booking_status:confirmed · booking_status:no_show · booking_status:completed · manual

### Outbound Settings (already built)

Calling hours (09:00–20:00), voicemail behavior, daily limit (50), suppression (1 call/day, 3/week, 2 SMS/day, 7-day decline cooldown, 30-day conversion cooldown), DNC compliance.

### Follow-Up Engine

Database-driven. SequenceEnrollment with status (active/completed/cancelled/paused), current_step, next_step_due_at. process-sequences cron every 5 min. Stop conditions: reply, booking.

### Cron Jobs (13 active in vercel.json — do not add more)

core (*/2min) · speed-to-lead (*/2min) · heartbeat (*/5min) · weekly-trust (Mon 9AM) · trial-reminders (daily 9AM) · first-day-check (daily 10AM) · day-3-nudge (daily 11AM) · phone-billing (1st 3AM) · usage-overage (1st 4AM) · daily-metrics (daily 12:15AM) · weekly-digest (Mon 8AM) · process-sequences (*/5min) · usage-alerts (daily 6AM)

### Redirects (76 in next.config.ts — do not add more)

All /dashboard/* → /app/*. All /onboarding/* → /activate. Catch-all included.

---

## NON-NEGOTIABLE RULES

1. **Revenue Recovered is the hero metric.** Dashboard, weekly digest, pricing, cancellation.
2. **No fake data.** HeroRevenueWidget is labeled "Example dashboard." Keep it that way.
3. **Light theme on /app/*.** Dark is for marketing pages only.
4. **One onboarding path:** /activate. Everything redirects there.
5. **billing-plans.ts is the source of truth.** Never hardcode tier data.
6. **Outbound respects safety.** Opt-out, suppression, daily limit, business hours, timezone. Always.
7. **Every call outcome triggers follow-up.** No call ends without a next action.
8. **Respect i18n.** All new strings use `t("key")`. No hardcoded English.
9. **Tailwind v4.** @theme directives in globals.css. No tailwind.config.js.
10. **Forms: native state + Zod.** No react-hook-form.
11. **529 tests must stay green.** Run `npm test` before and after changes.
12. **Self-host everything possible.** Own the stack. Own the margin.

---

## EXECUTION ORDER

| Priority | What | Files | When |
|----------|------|-------|------|
| **1** | Fix HeroRevenueWidget dark classes | `src/components/sections/HeroRevenueWidget.tsx` | Day 1 |
| **2** | Homepage section reorder (ROI calc up) | `src/app/page.tsx` | Day 1 |
| **3** | Dashboard progress bar color fix | `src/components/dashboard/UnifiedDashboard.tsx` | Day 1 |
| **4** | FAQ JSON-LD sync | `src/app/page.tsx` | Day 1 |
| **5** | Create /results page | `src/app/results/page.tsx` | Day 2 |
| **6** | Create /security page | `src/app/security/page.tsx` | Day 2 |
| **7** | Create /outbound page | `src/app/outbound/page.tsx` | Day 3 |
| **8** | Product tour component | `src/components/ui/ProductTour.tsx` | Day 3–4 |
| **9** | Expand Industries to 8+ | `src/components/sections/Industries.tsx` | Day 4 |
| **10** | Dunning emails | `src/app/api/webhooks/stripe/route.ts` | Day 5 |
| **11** | Trial grace period | Workspace status logic | Day 5 |
| **12** | Cancellation flow | `src/app/app/settings/billing/cancel/page.tsx` | Day 6 |
| **13** | PostHog event tracking | Various components | Day 6–7 |
| **14** | Voice stack: Pipecat server | `services/voice/` | Week 2–3 |
| **15** | Voice stack: Kokoro TTS | `services/voice/tts/` | Week 3 |
| **16** | Voice stack: Canary STT | `services/voice/stt/` | Week 3–4 |
| **17** | Voice stack: Llama 3.3 8B | `services/voice/llm/` | Week 4–5 |
| **18** | Telnyx migration | `src/lib/telephony/` | Week 5–6 |
| **19** | Blog posts (10 initial) | `src/app/blog/` | Week 2–4 (parallel) |
| **20** | Industry pages (3 new) | `src/app/industries/` | Week 2–4 (parallel) |

---

*Execute in order. Test everything. Ship it.*
