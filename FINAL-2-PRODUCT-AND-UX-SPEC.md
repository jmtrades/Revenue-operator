# RECALL TOUCH — FINAL PRODUCT + UX + WEBSITE SPEC

---

## 1. WEBSITE ARCHITECTURE

### Pages required at launch

| URL | Purpose | Min Words |
|-----|---------|-----------|
| `/` | Homepage — 10-section conversion page | 800 |
| `/pricing` | 4-tier comparison with outcome framing, FAQ | 600 |
| `/demo` | Voice demo + product screenshots + video walkthrough | 400 |
| `/results` | Customer results (placeholder until real data) | 400 |
| `/industries/dental` | Dental-specific pain, workflows, outcomes | 1500 |
| `/industries/hvac` | HVAC-specific | 1500 |
| `/industries/legal` | Legal intake-specific | 1500 |
| `/compare/smith-ai` | Feature-by-feature comparison | 1000 |
| `/compare/ruby` | Feature-by-feature comparison | 1000 |
| `/security` | Encryption, rate limiting, compliance roadmap | 800 |
| `/activate` | Onboarding wizard (5 steps, 3 minutes) | N/A |
| `/sign-in` | Login | N/A |

### Homepage section order (optimized for conversion)

1. **Navbar** — Brand, Product/Solutions/Pricing/Demo, Sign In, "Start Free Trial"
2. **Hero** — Headline + subheadline + primary CTA + trust signals + revenue card
3. **Problem Statement** — Industry loss calculator with animated numbers
4. **ROI Calculator** — 3 sliders, recovery estimate, "pays for itself" comparison (MOVED UP from position 5)
5. **How It Works** — 3 steps: forward calls, AI picks up, you get notified
6. **Industries** — 8+ cards, not 5. Each links to dedicated page.
7. **Differentiation** — "Not Just Another AI Receptionist" + comparison + 5 differentiators
8. **Mode Selector** — Solo/Sales/Business tabs with preview cards
9. **Pricing** — 4 tiers with outcome framing. No deal-size caps in examples.
10. **FAQ** — 10 questions. Lead with "How is this different from an AI receptionist?"
11. **Final CTA** — "Every Day Without Recall Touch Is Revenue Walking Out the Door."
12. **Footer** — Product, Solutions, Company, Legal sections. Founder name/photo.

### Homepage copy

**Headline:** "Stop Losing Revenue to Missed Calls and Broken Follow-Up."

**Subheadline:** "Recall Touch answers every call, books appointments, and runs automated recovery sequences. See exactly how much revenue you recover — in your first week."

**Primary CTA:** "Start Free Trial"

**Trust bar:** AI Revenue Operations. Use your existing number. 2-min setup. No credit card.

**ROI Calculator defaults:** Monthly calls: 220. Missed %: 22%. Average value: REMOVE the $650 default. Use a range selector: $200 / $500 / $1,000 / $2,500 / $5,000 / $10,000+. This prevents capping perceived value.

---

## 2. APP UX SPEC

### Sidebar (9 items — do not add more)

Dashboard (LayoutList), Calls (PhoneCall), Contacts (Users), Inbox (MessageSquare), Calendar (Calendar), Follow-Ups (ListOrdered), Campaigns (Megaphone), Analytics (BarChart3), Settings (Settings).

Mobile: 3-tab bottom nav (Dashboard, Calls, Inbox) + More overflow.

### Settings progressive disclosure

Group 16+ settings pages into 3 sections with collapsible headers in the settings sidebar:

**Your Business:** business info, call rules, business hours, industry templates, outbound settings.
**Integrations:** phone numbers, calendar, CRM/webhooks, voice settings, compliance.
**Account:** billing, team members, notifications, errors/audit log.

### Dashboard

Revenue recovered (green, large, USD, trend %). Quick stats row (calls, appointments, follow-ups). Minutes usage bar (green <80%, amber 80-99%, red 100%+). Needs-attention queue (primary action area — each item has call/text buttons). Campaign overview (active campaigns, enrollments, bookings). Activity feed (recent events with timestamps).

**Light theme only.** All backgrounds use CSS variables from globals.css. No zinc-900, no black/30.

### Empty states (every page needs one)

- **Calls:** "No calls yet. Connect a phone number to start answering calls. [Connect Number]"
- **Contacts:** "No contacts yet. Import a list or wait for your first call. [Import CSV] [Connect Number]"
- **Inbox:** "No conversations yet. Messages will appear here after your first call."
- **Campaigns:** "No campaigns yet. Create your first outbound campaign. [Create Campaign]"
- **Analytics:** "Not enough data yet. Analytics will populate after your first week of calls."
- **Follow-Ups:** "No sequences yet. Create a follow-up workflow. [Create Sequence]"

### Onboarding (/activate)

5 steps. Progress bar at top. Skip allowed on non-critical steps. Return anytime.

1. **Industry** — Select from 8+ options or "Other." Sets default templates and voice.
2. **Phone Number** — Connect existing (forward) or buy new ($3/mo). E.164 validation. Clear instructions per provider (Telnyx provisioning).
3. **Voice** — Choose from 6 presets. Play sample. 15-second preview for each.
4. **Business Hours** — Set open/close times. Timezone auto-detected. After-hours toggle.
5. **Test Call** — Call your own number. AI answers. Verify greeting. Approve or adjust.

**Critical: add error boundary.** If translations fail or any step crashes, show "Something went wrong. [Try Again]" — not a white screen.

**Critical: step 5 must complete before agent goes live.** The "Go Live" button in agent settings should be disabled until at least one test call succeeds.

### Agent controls

5-step setup: Identity (name, personality, template), Behavior (allowed/forbidden actions, escalation rules, tone), Knowledge (FAQ, business info, scripts), Voice (preset or clone), Test (call and verify).

**Sandbox mode:** Agent is live but all outbound actions (SMS, calls, bookings) are logged and visible in dashboard but NOT executed. Owner reviews and approves before full deployment. Toggle in agent settings.

**Rename "Receptionist" template to "Inbound Agent"** in all user-facing UI. Keep internal code references unchanged for backward compatibility.

---

## 3. BILLING SPEC

### Plans (source of truth: billing-plans.ts)

| Plan | Monthly | Annual | Minutes | Overage | Agents | Seats |
|------|---------|--------|---------|---------|--------|-------|
| Solo | $49 | $39/mo | 100 | $0.30/min | 1 | 1 |
| Business | $297 | $247/mo | 500 | $0.20/min | 3 | 5 |
| Scale | $997 | $847/mo | 3,000 | $0.12/min | 10 | Unlimited |
| Enterprise | Custom | Custom | Unlimited | Negotiated | Unlimited | Unlimited |

### Structural fixes required

1. **Checkout must return proper HTTP status codes.** 400 for validation errors. 403 for unauthorized. 500 for server errors. 503 for missing config. NEVER 200 for errors.

2. **Billing status must import plan limits from billing-plans.ts.** Delete the hardcoded `{ solo: 100, business: 500, scale: 3000 }` map in status/route.ts. Replace with `BILLING_PLANS[tier].includedMinutes`.

3. **Store `trial_ends_at` on workspace row at creation.** Calculate once: `new Date(Date.now() + 14 * 86400000)`. Read everywhere. Delete all other trial-end calculations.

4. **Webhook dedup: SELECT before INSERT.** Replace catch-based 23505 handling with explicit `SELECT FROM webhook_events WHERE stripe_event_id = event.id` before insert. If exists, return 200.

5. **Change-plan: accept only `plan_id`.** Reject `planId` with `{ error: "Use plan_id, not planId" }`.

### Dunning sequence

Day 0: payment fails → email "Payment failed. Update your payment method." → Stripe auto-retries.
Day 3: retry fails → email "Second attempt failed. Service will pause in 4 days."
Day 5: retry fails → email "Final notice. Update payment to keep your AI running."
Day 7: 4th failure → workspace status='payment_failed'. Banner in app. Calls still answered for 48h grace.
Day 9: calls stop. Reactivation email.

### Trial lifecycle

Day 0: signup → `trial_ends_at` stored. Day 1: check-in email. Day 3: nudge with stats. Day 7: weekly digest. Day 10: in-app banner. Day 12: email summary. Day 14: status='trial_expired'. 3-day grace (calls answered, banner shown). Day 17: calls stop. Reactivation email. Day 47: data deleted (warning at day 37).

### Cancellation

Survey modal: "What is the main reason?" (Too expensive / Not using enough / Missing features / Switching / Other). Save offer: "Stay and get 1 month free on annual." If continuing: "Export your contacts before leaving. [Export] [Cancel Subscription]." Confirmation: subscription cancelled at end of current period. Data retained 30 days.

---

## 4. VOICE SPEC

### Current stack (keep for now)

Vapi + Deepgram Aura-2 (TTS) + Deepgram Nova-2 (STT) + Claude Haiku 4.5 + Twilio. $0.099/min. Do not touch until 10+ paying customers.

### Migration phases (realistic timeline)

Phase 2 (Month 2-3): Pipecat replaces Vapi. $0.064/min. 2-4 weeks engineering.
Phase 3 (Month 4-6): Kokoro 82M replaces Deepgram TTS. $0.049/min. Quality gate: 50 blind-tested calls.
Phase 4 (Month 6-8): Canary-1B-Flash replaces Deepgram STT. $0.034/min. Quality gate: WER comparison.
Phase 5 (Month 8-12): Llama 3 8B replaces Claude for 90% of calls. $0.012/min. Permanent Claude fallback.
Phase 6 (Month 3, parallel): Telnyx replaces Twilio. $0.008/min. Low risk.

**Rule: never migrate two voice components at the same time.**

### Voice presets

Solo: 6 standard (professional female/male, warm female/male, neutral, energetic).
Business+: 40 industry-optimized (dental front desk, legal intake, HVAC dispatcher, etc.).
Voice cloning: Business 3 slots, Scale 10, Enterprise unlimited. Via Fish Speech S1-mini.

### Call failure handling

Voice service down → pre-recorded message + voicemail → needs-attention item.
LLM timeout (>5s) → "Let me transfer you" → human or voicemail.
Calendar API error → "I will have someone call you back to confirm" → needs-attention item.
Call drops → auto-SMS within 60s: "Sorry we got disconnected."
5+ failures/hour → Sentry alert to founder.

---

## 5. SEO SPEC

### Schema types required

Organization (exists). SoftwareApplication (exists). FAQPage (exists — fix Q3 mismatch in page.tsx JSON-LD). LocalBusiness on each /industries/[slug]. BreadcrumbList on all sub-pages. HowTo on product pages. AggregateRating when reviews exist.

### Metadata rules

Title: `{Page Title} — Recall Touch` (max 60 chars). Description: unique per page, 150-160 chars, primary keyword + CTA. H1: one per page, matches keyword intent. Canonical: self-referencing on every page. No-index on /app/*, /admin/*, /ops/*.

### Internal linking

Every industry page links to /pricing + /demo. Every comparison page links to /results + /pricing. Every blog post links to relevant industry page + CTA. Homepage links to top 3 industries + /pricing + /demo.

---

## 6. QA SPEC

### 20 launch-critical test cases

1. Checkout error → proper HTTP status (not 200)
2. Checkout → Stripe session has correct trial_end (14 days)
3. Duplicate webhook → second returns 200, no double-processing
4. invoice.payment_failed → dunning email sent
5. Billing status minutes match billing-plans.ts
6. Phone provision rate limited at 5/hour
7. Invalid E.164 rejected ("+999" → 400)
8. Trial expiry → workspace paused at day 14
9. Grace period → calls answered for 3 days after expiry
10. Cancellation → survey shown, reason captured
11. Campaign launch blocked without phone number
12. Campaign launch shows confirmation modal with contact count
13. Outbound respects suppression (1 call/day per contact)
14. Outbound respects business hours (delays to 9am)
15. Inbound answer latency <3s (95th percentile)
16. Booking creates Google Calendar event
17. Dashboard revenue_recovered_cents displays correctly
18. Signup requires email verification
19. Expired session redirects to /sign-in
20. Agent go-live blocked without test call

### 10 fallback behaviors

1. Voice down → pre-recorded message + voicemail
2. LLM timeout → transfer to human
3. Calendar error → "We will call you back"
4. SMS failure → retry 3x at 30s intervals
5. Stripe redirect failure → inline payment fallback
6. DB timeout → cached data with "last updated" timestamp
7. Phone provisioning failure → "Try again in 5 minutes"
8. Sequence step failure → skip, log, continue
9. Opt-out during call → immediate stop, permanent opt-out
10. Webhook failure → return 500 (Stripe retries), Sentry alert

---

## 7. TRUST SPEC

### /security page content

Data encryption: HMAC-SHA256 sessions, HTTPS everywhere, Supabase RLS.
Access control: workspace isolation, role-based permissions.
Rate limiting: Upstash Redis sliding window, per-endpoint.
Call recording: encrypted storage, workspace-owner access only.
Compliance: TCPA compliance for outbound, per-contact suppression, DNC checks, configurable consent statements.
Monitoring: Sentry error tracking, PostHog analytics, 13 health crons.
Data handling: 30-day retention after cancellation, export on request.

### Agent guardrails (user-facing trust story)

Every action reviewable. Every sequence configurable. Per-contact suppression rules prevent spam. Human escalation on demand. Sandbox mode for testing before deployment. Full audit trail under Settings.
